// Chakra and UI 
import {
  Heading,
  Box,
  Button,
  Text,
  Image,
  Input,
  useToast,
} from "@chakra-ui/react";
import { Row, Column } from "lib/chakraUtils";
import DashboardBox from "components/shared/DashboardBox";
import { ModalDivider } from "components/shared/Modal";

// React
import { useState } from "react";
import { useTranslation } from "next-i18next";
import { useQuery, useQueryClient } from "react-query";
import { HashLoader } from "react-spinners";

// Rari
import { useRari } from "context/RariContext";
import ERC20ABI from '../../../../esm/Vaults/abi/ERC20.json'

// Components


// Utils
import { tokens } from "utils/tokenUtils";
import { handleGenericError } from "utils/errorHandling";


// Hooks
import { useTokenBalance, fetchTokenBalance } from "hooks/useTokenBalance";
import {
  TrancheRating,
  TranchePool,
  trancheRatingIndex,
} from "hooks/tranches/useSaffronData";
import { useSaffronData } from "hooks/tranches/useSaffronData";

// Rari Tokens Generator
import { Token } from "rari-tokens-generator";

// Ethers
import { Contract, utils, constants, BigNumber } from 'ethers'

function noop() {}

const SFIToken = {
  symbol: "SFI",
  address: "0xb753428af26e81097e7fd17f40c88aaa3e04902c",
  name: "Spice",
  decimals: 18,
  color: "#C34535",
  overlayTextColor: "#fff",
  logoURL:
    "https://assets.coingecko.com/coins/images/13117/small/sfi_red_250px.png?1606020144",
} as Token;

interface Props {
  onClose: () => any;

  tranchePool: TranchePool;
  trancheRating: TrancheRating;
}

enum UserAction {
  NO_ACTION,
  WAITING_FOR_TRANSACTIONS,
}

export const requiresSFIStaking = (trancheRating: TrancheRating) => {
  return trancheRating === TrancheRating.A;
};

const useSFIBalance = () => {
  const { rari, address } = useRari();

  const { data } = useQuery("sfiBalance", async () => {
    const stringBalance: BigNumber = await new Contract(
      SFIToken.address,
      ERC20ABI as any,
      rari.provider.getSigner()
    ).balanceOf(address);

    return stringBalance
  });

  return { sfiBalance: data };
};

const AmountSelect = ({ onClose, tranchePool, trancheRating }: Props) => {
  const token = tokens[tranchePool];

  const toast = useToast();

  const queryClient = useQueryClient();

  const { rari, address } = useRari();

  const { data: poolTokenBalance } = useTokenBalance(token.address);

  const { sfiBalance } = useSFIBalance();

  const { saffronPool } = useSaffronData();

  const { data: sfiRatio } = useQuery(tranchePool + " sfiRatio", async () => {
    return parseFloat(utils.formatEther(await saffronPool.methods.SFI_ratio().call()));
  });

  const [userAction, setUserAction] = useState(UserAction.NO_ACTION);

  const [userEnteredAmount, _setUserEnteredAmount] = useState("");

  const [amount, _setAmount] = useState<BigNumber | null>(constants.Zero);

  const updateAmount = (newAmount: string) => {
    if (newAmount.startsWith("-")) {
      return;
    }

    _setUserEnteredAmount(newAmount);

    const bigAmount = BigNumber.from(newAmount);
    bigAmount.lte(constants.Zero)
      ? _setAmount(null)
      : _setAmount(bigAmount.mul(token.decimals < 18 ? 10 ** token.decimals : constants.WeiPerEther));

    setUserAction(UserAction.NO_ACTION);
  };

  const amountIsValid = (() => {
    if (amount === null || amount.isZero()) {
      return false;
    }

    if (!poolTokenBalance) {
      return false;
    }

    return amount.lte(poolTokenBalance.toString());
  })();

  const sfiRequired = (() => {
    return amount && sfiRatio
      ? amount
          .div(token.decimals > 18 ? constants.WeiPerEther : 10 ** token.decimals)
          .mul(utils.parseUnits(((1 / sfiRatio) * 10 ** SFIToken.decimals).toString()))
      : constants.Zero;
  })();

  const hasEnoughSFI = (() => {
    if (!requiresSFIStaking(trancheRating)) {
      return true;
    }

    if (!sfiBalance || sfiBalance.isZero()) {
      return false;
    }

    return sfiRequired.lte(sfiBalance.toString());
  })();

  const { t } = useTranslation();

  let depositOrWithdrawAlert;

  if (amount === null) {
    depositOrWithdrawAlert = t("Enter a valid amount to deposit.");
  } else if (amount.isZero()) {
    depositOrWithdrawAlert = t("Enter a valid amount to deposit.");
  } else if (!poolTokenBalance || !sfiBalance) {
    depositOrWithdrawAlert = t("Loading your balance of {{token}}...", {
      token: tranchePool,
    });
  } else if (!amountIsValid) {
    depositOrWithdrawAlert = t("You don't have enough {{token}}.", {
      token: tranchePool,
    });
  } else if (!hasEnoughSFI) {
    depositOrWithdrawAlert = t(
      "You need {{sfiMissing}} more SFI to deposit (1 SFI : {{sfiRatio}} {{tranchePool}})",
      {
        sfiRatio: sfiRatio ?? "?",
        tranchePool,
        sfiMissing: sfiRequired
          .sub(sfiBalance.toString())
          .div(10 ** SFIToken.decimals)
          .toString(),
      }
    );
  } else {
    depositOrWithdrawAlert = t("Click confirm to continue!");
  }

  const onConfirm = async () => {
    try {
      //@ts-ignore
      const amountBN = toBN(amount!.decimalPlaces(0));

      // Check A tranche cap
      if (trancheRating === TrancheRating.A) {
        const limits = await saffronPool.methods
          .get_available_S_balances()
          .call();

        const amountLeftBeforeCap = BigNumber.from(limits[0] + limits[1]).div( 10 );

        if (amountLeftBeforeCap.lt(amountBN.toString())) {
          toast({
            title: "Error!",
            description: `The A tranche is capped at 1/10 the liquidity of the S tranche. Currently you must deposit less than ${amountLeftBeforeCap
              .div(10 ** token.decimals)
              .toString()} ${
              token.symbol
            } or deposit into the S tranche (as more is deposited into S tranche, the cap on the A tranche increases).`,
            status: "error",
            duration: 18000,
            isClosable: true,
            position: "top-right",
          });

          return;
        }
      }

      // They must have already seen the quote as the button to trigger this function is disabled while it's loading:
      // This means they are now ready to start sending transactions:
      setUserAction(UserAction.WAITING_FOR_TRANSACTIONS);

      const poolAddress = saffronPool.options.address;

      const SFIContract = new Contract(SFIToken.address, ERC20ABI, rari.provider.getSigner());

      const trancheToken = new Contract(token.address, ERC20ABI as any, rari.provider.getSigner());

      const hasApprovedEnoughSFI = requiresSFIStaking(trancheRating)
        ? (await SFIContract.methods.allowance(address, poolAddress).call()).gte(amountBN)
        : true;

      const hasApprovedEnoughPoolToken = (await trancheToken.methods.allowance(address, poolAddress).call()).gte(amountBN);

      if (!hasApprovedEnoughSFI) {
        // Approve the amount of poolToken because it will always be more than sfiRequired
        const txn = SFIContract.methods
          .approve(poolAddress, amountBN.toString())
          .send({ from: address });

        // If the user has already approved the poolToken we need to wait for this txn to complete before showing the add liquidity txn
        if (hasApprovedEnoughPoolToken) {
          await txn;
        }
      }

      if (!hasApprovedEnoughPoolToken) {
        // Approve tranche token (DAI or USDC)
        await trancheToken.methods
          .approve(saffronPool.options.address, amountBN.toString())
          .send({ from: address });
      }

      await saffronPool.methods
        .add_liquidity(amountBN.toString(), trancheRatingIndex(trancheRating))
        .send({ from: address });

      queryClient.refetchQueries();
      // Wait 2 seconds for refetch and then close modal.
      // We do this instead of waiting the refetch because some refetches take a while or error out and we want to close now.
      await new Promise((resolve) => setTimeout(resolve, 2000));
      onClose();
    } catch (e) {
      handleGenericError(e, toast);
      setUserAction(UserAction.NO_ACTION);
    }
  };

  return userAction === UserAction.WAITING_FOR_TRANSACTIONS ? (
    <Column expand mainAxisAlignment="center" crossAxisAlignment="center" p={4}>
      <HashLoader
        size={70}
        color={requiresSFIStaking(trancheRating) ? SFIToken.color : token.color}
        loading
      />
      <Heading mt="30px" textAlign="center" size="md">
        {t("Check your wallet to submit the transactions")}
      </Heading>
      <Text fontSize="sm" mt="15px" textAlign="center">
        {t("Do not close this tab until you submit all transactions!")}
      </Text>
    </Column>
  ) : (
    <>
      <Row
        width="100%"
        mainAxisAlignment="center"
        crossAxisAlignment="center"
        p={4}
      >
        <Heading fontSize="27px">
          {t("{{trancheRating}} Tranche Deposit", { trancheRating })}
        </Heading>
      </Row>
      <ModalDivider />
      <Column
        mainAxisAlignment="space-between"
        crossAxisAlignment="center"
        p={4}
        height="100%"
      >
        <Text fontWeight="bold" fontSize="sm" textAlign="center">
          {depositOrWithdrawAlert}
        </Text>
        <DashboardBox width="100%" height="70px">
          <Row
            p={4}
            mainAxisAlignment="space-between"
            crossAxisAlignment="center"
            expand
          >
            <AmountInput
              selectedToken={tranchePool}
              displayAmount={userEnteredAmount}
              updateAmount={updateAmount}
            />

            <TokenNameAndMaxButton
              selectedToken={tranchePool}
              updateAmount={updateAmount}
            />
          </Row>
        </DashboardBox>

        {requiresSFIStaking(trancheRating) ? (
          <DashboardBox width="100%" height="70px">
            <Row
              p={4}
              mainAxisAlignment="space-between"
              crossAxisAlignment="center"
              expand
            >
              <AmountInput
                selectedToken="SFI"
                displayAmount={
                  sfiRequired.isZero()
                    ? "0.0"
                    : sfiRequired.div(10 ** SFIToken.decimals).toString()
                }
                updateAmount={noop}
              />

              <TokenNameAndMaxButton selectedToken="SFI" updateAmount={noop} />
            </Row>
          </DashboardBox>
        ) : null}

        <Button
          fontWeight="bold"
          fontSize="2xl"
          borderRadius="10px"
          width="100%"
          height="70px"
          bg={requiresSFIStaking(trancheRating) ? SFIToken.color : token.color}
          _hover={{ transform: "scale(1.02)" }}
          _active={{ transform: "scale(0.95)" }}
          color={token.overlayTextColor}
          onClick={onConfirm}
          isLoading={!poolTokenBalance}
          isDisabled={!amountIsValid || !hasEnoughSFI}
        >
          {t("Confirm")}
        </Button>
      </Column>
    </>
  );
};

export default AmountSelect;

const TokenNameAndMaxButton = ({
  selectedToken,
  updateAmount,
}: {
  selectedToken: string;

  updateAmount: (newAmount: string) => any;
}) => {
  const isSFI = selectedToken === "SFI";

  const token = isSFI ? SFIToken : tokens[selectedToken];

  const { address, fuse} = useRari();

  const [isMaxLoading, setIsMaxLoading] = useState(false);

  const setToMax = async () => {
    setIsMaxLoading(true);
    let maxBN: BigNumber;

    const balance = await fetchTokenBalance(token.address, fuse, address);

    maxBN = balance;

    if (maxBN.lt(constants.Zero) || maxBN.isZero()) {
      updateAmount("");
    } else {
      const str = maxBN
        .div(token.decimals > 18 ? constants.WeiPerEther : 10 ** token.decimals).toString()

      if (str.startsWith("0.000000")) {
        updateAmount("");
      } else {
        updateAmount(str);
      }
    }

    setIsMaxLoading(false);
  };

  const { t } = useTranslation();

  return (
    <Row mainAxisAlignment="flex-start" crossAxisAlignment="center">
      <Row mainAxisAlignment="flex-start" crossAxisAlignment="center">
        <Box height="25px" width="25px" mr={2}>
          <Image
            width="100%"
            height="100%"
            borderRadius="50%"
            backgroundImage={`url(/static/small-white-circle.png)`}
            src={token.logoURL}
            alt=""
          />
        </Box>
        <Heading fontSize="24px" mr={2}>
          {selectedToken}
        </Heading>
      </Row>

      {isSFI ? null : (
        <Button
          ml={1}
          height="28px"
          width="58px"
          bg="transparent"
          border="2px"
          borderRadius="8px"
          borderColor="#272727"
          fontSize="sm"
          fontWeight="extrabold"
          _hover={{}}
          _active={{}}
          onClick={setToMax}
          isLoading={isMaxLoading}
        >
          {t("MAX")}
        </Button>
      )}
    </Row>
  );
};

const AmountInput = ({
  displayAmount,
  updateAmount,
  selectedToken,
}: {
  displayAmount: string;
  updateAmount: (symbol: string) => any;
  selectedToken: string;
}) => {
  const isSFI = selectedToken === "SFI";

  const token = isSFI ? SFIToken : tokens[selectedToken];

  return (
    <Input
      style={isSFI ? { pointerEvents: "none" } : {}}
      type="number"
      inputMode="decimal"
      fontSize="3xl"
      fontWeight="bold"
      variant="unstyled"
      _placeholder={{ color: token.color }}
      placeholder="0.0"
      value={displayAmount}
      color={token.color}
      onChange={(event) => updateAmount(event.target.value)}
      mr={4}
    />
  );
};

// Chakra and UI
import { Row, Column } from "lib/chakraUtils";
import {
  Heading,
  Box,
  Button,
  Text,
  Image,
  Input,
  Link,
  useToast,
  IconButton,
} from "@chakra-ui/react";
import { HashLoader } from "react-spinners";
import DashboardBox from "components/shared/DashboardBox";
import { ModalDivider } from "components/shared/Modal";
import { SettingsIcon } from "@chakra-ui/icons";

// React
import { useState } from "react";
import { useQuery, useQueryClient } from "react-query";
import { useTranslation } from 'next-i18next';

// Rari
import { useRari } from "context/RariContext";
import { LP_TOKEN_CONTRACT } from "../../../../esm/Vaults/governance/governance"

// Hooks
import {
  fetchTokenBalance,
  useTokenBalance,
} from "hooks/useTokenBalance";

// Utils
import { Mode } from ".";
import { handleGenericError } from "utils/errorHandling";

// Ethers
import { BigNumber, constants, utils } from 'ethers';

interface Props {
  onClose: () => any;
  mode: Mode;
  openOptions: () => any;
}

enum UserAction {
  NO_ACTION,
  WAITING_FOR_TRANSACTIONS,
}

const AmountSelect = ({ onClose, mode, openOptions }: Props) => {
  const toast = useToast();

  const queryClient = useQueryClient();

  const [userAction, setUserAction] = useState(UserAction.NO_ACTION);

  const [userEnteredAmount, _setUserEnteredAmount] = useState("");

  const [amount, _setAmount] = useState<BigNumber | null>(constants.Zero);

  const { t } = useTranslation();

  const { rari, address } = useRari();

  const { data: balance } = useTokenBalance(LP_TOKEN_CONTRACT);

  const { data: staked } = useQuery(address + "pool2BalanceBN", () => {
    return rari.governance.rgt.sushiSwapDistributions.stakingBalanceOf(address);
  });

  const updateAmount = (newAmount: string) => {
    if (newAmount.startsWith("-")) {
      return;
    }

    _setUserEnteredAmount(newAmount);

    const bigAmount = utils.parseUnits(newAmount).div(constants.WeiPerEther);
    bigAmount.lt(constants.Zero)
      ? _setAmount(constants.Zero)
      : _setAmount(bigAmount.mul(constants.WeiPerEther));

    setUserAction(UserAction.NO_ACTION);
  };

  const amountIsValid = (() => {
    if (amount === null || amount.isZero()) {
      return false;
    }

    if (!balance || !staked) {
      return false;
    }

    if (mode === Mode.DEPOSIT) {
      return amount.lte(balance.toString());
    } else {
      return amount.lte(staked.toString());
    }
  })();

  let depositOrWithdrawAlert;

  if (amount === null || amount.isZero()) {
    if (mode === Mode.DEPOSIT) {
      depositOrWithdrawAlert = t("Enter a valid amount to deposit.");
    } else if (mode === Mode.WITHDRAW) {
      depositOrWithdrawAlert = t("Enter a valid amount to withdraw.");
    }
  } else if (!balance) {
    depositOrWithdrawAlert = t("Loading your balance of {{token}}...", {
      token: "ETH-RGT SLP",
    });
  } else if (!amountIsValid) {
    depositOrWithdrawAlert = t("You don't have enough {{token}}.", {
      token: "ETH-RGT SLP",
    });
  } else {
    depositOrWithdrawAlert = t("Click confirm to continue!");
  }

  const onConfirm = async () => {
    try {
      setUserAction(UserAction.WAITING_FOR_TRANSACTIONS);

      if (mode === Mode.DEPOSIT) {
        await rari.governance.rgt.sushiSwapDistributions.deposit(amount, address);
      } else {
        await rari.governance.rgt.sushiSwapDistributions.withdraw(amount, address);
      }

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
      <HashLoader size={70} color={"#929192"} loading />
      <Heading mt="30px" textAlign="center" size="md">
        {t("Check your wallet to submit the transactions")}
      </Heading>
      <Text fontSize="sm" mt="15px" textAlign="center">
        {mode === Mode.DEPOSIT
          ? t("Do not close this tab until you submit both transactions!")
          : t("You may close this tab after submitting the transaction.")}
      </Text>
    </Column>
  ) : (
    <>
      <Row
        width="100%"
        mainAxisAlignment="space-between"
        crossAxisAlignment="center"
        p={4}
      >
        <Box width="40px" />
        <Heading fontSize="27px">
          {mode === Mode.DEPOSIT ? t("Deposit") : t("Withdraw")}
        </Heading>
        <IconButton
          color="#FFFFFF"
          variant="ghost"
          aria-label="Options"
          icon={<SettingsIcon />}
          _hover={{
            transform: "rotate(360deg)",
            transition: "all 0.7s ease-in-out",
          }}
          _active={{}}
          onClick={openOptions}
        />
      </Row>

      <ModalDivider />

      <Column
        mainAxisAlignment="space-between"
        crossAxisAlignment="center"
        p={4}
        height="100%"
      >
        <Text fontWeight="bold" fontSize="sm" textAlign="center">
          <Link
            href="https://www.notion.so/Fees-e4689d7b800f485098548dd9e9d0a69f"
            isExternal
          >
            {depositOrWithdrawAlert}
          </Link>
        </Text>

        <DashboardBox width="100%" height="70px" mt={4}>
          <Row
            p={4}
            mainAxisAlignment="space-between"
            crossAxisAlignment="center"
            expand
          >
            <AmountInput
              displayAmount={userEnteredAmount}
              updateAmount={updateAmount}
            />

            <TokenNameAndMaxButton updateAmount={updateAmount} mode={mode} />
          </Row>
        </DashboardBox>

        <Button
          mt={4}
          fontWeight="bold"
          fontSize="2xl"
          borderRadius="10px"
          width="100%"
          height="70px"
          bg={"#929192"}
          _hover={{ transform: "scale(1.02)" }}
          _active={{ transform: "scale(0.95)" }}
          color={"#FFF"}
          onClick={onConfirm}
          isLoading={!balance}
          isDisabled={!amountIsValid}
        >
          {t("Confirm")}
        </Button>
      </Column>
    </>
  );
};

export default AmountSelect;

const TokenNameAndMaxButton = ({
  updateAmount,
  mode,
}: {
  updateAmount: (newAmount: string) => any;
  mode: Mode;
}) => {
  const { fuse, address, rari } = useRari();

  const [isMaxLoading, setIsMaxLoading] = useState(false);

  const setToMax = async () => {
    setIsMaxLoading(true);
    let maxBN: BigNumber;

    if (mode === Mode.DEPOSIT) {
      const balance = await fetchTokenBalance( LP_TOKEN_CONTRACT, fuse, address );
      maxBN = balance;

    } else {
      const deposited = await rari.governance.rgt.sushiSwapDistributions.stakingBalanceOf(address);
      maxBN = deposited;
    }

    if (maxBN.lt(constants.Zero) || maxBN.isZero()) {
      updateAmount("0");
    } else {
      const str = maxBN.div(constants.WeiPerEther).toString()
      if (str.startsWith("0.000000")) {
        updateAmount("0");
      } else {
        updateAmount(str);
      }
    }

    setIsMaxLoading(false);
  };

  const { t } = useTranslation();

  return (
    <Row
      mainAxisAlignment="flex-start"
      crossAxisAlignment="center"
      flexShrink={0}
    >
      <Row
        mainAxisAlignment="flex-start"
        crossAxisAlignment="center"
        flexShrink={0}
      >
        <Box height="30px" width="30px" mr={2} mb="2px">
          <Image
            width="100%"
            height="100%"
            borderRadius="50%"
            backgroundImage={`url(/static/small-white-circle.png)`}
            src={
              "https://assets.coingecko.com/coins/images/12900/small/rgt_logo.png?1603340632"
            }
            alt=""
          />
        </Box>
        <Heading fontSize="24px" mr={2}>
          ETH-RGT
        </Heading>
      </Row>

      <Button
        flexShrink={0}
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
    </Row>
  );
};

const AmountInput = ({
  displayAmount,
  updateAmount,
}: {
  displayAmount: string;
  updateAmount: (symbol: string) => any;
}) => {
  return (
    <Input
      width="100%"
      type="number"
      inputMode="decimal"
      fontSize="3xl"
      fontWeight="bold"
      variant="unstyled"
      _placeholder={{ color: "#929192" }}
      placeholder="0.0"
      value={displayAmount}
      color={"#929192"}
      onChange={(event) => updateAmount(event.target.value)}
      mr={4}
    />
  );
};

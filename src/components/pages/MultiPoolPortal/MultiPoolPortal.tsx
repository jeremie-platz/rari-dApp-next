import { memo } from "react";
// Next
import dynamic from "next/dynamic";

import {
  Center,
  Column,
  Row,
  RowOnDesktopColumnOnMobile,
  useWindowSize,
} from "lib/chakraUtils";
import DashboardBox from "components/shared/DashboardBox";

const CaptionedStat = dynamic(() => import("components/shared/CaptionedStat"), {
  ssr: false,
});

const NewsAndTwitterLink = dynamic(() => import("./NewsAndTwitterLink"), {
  ssr: false,
});

const PoolsPerformanceChart = dynamic(
  () => import("components/shared/PoolsPerformance"),
  { ssr: false }
);

import {
  Box,
  Heading,
  Text,
  Image,
  Spinner,
  useDisclosure,
} from "@chakra-ui/react";

import { useRari } from "context/RariContext";

import { useTranslation } from "next-i18next";

import { PoolTypeProvider } from "context/PoolContext";
import { usePoolInfo } from "hooks/usePoolInfo";
import { useQuery } from "react-query";

import DepositModal from "../RariDepositModal";
import { SimpleTooltip } from "components/shared/SimpleTooltip";
import {
  APYMovingStat,
  APYWithRefreshMovingStat,
  RefetchMovingStat,
} from "components/shared/MovingStat";

import {
  smallStringUsdFormatter,
  stringUsdFormatter,
  usdFormatter,
} from "utils/bigUtils";

import { usePoolBalance, useTotalPoolsBalance } from "hooks/usePoolBalance";

import AppLink from "components/shared/AppLink";

import { useTVLFetchers } from "hooks/useTVL";
import { usePoolAPY } from "hooks/usePoolAPY";

import { BigNumber } from "ethers";
import { InfoIcon, QuestionIcon } from "@chakra-ui/icons";
import { useNoSlippageCurrencies } from "hooks/useNoSlippageCurrencies";
import { usePoolInterestEarned } from "hooks/usePoolInterest";
import { useAuthedCallback } from "hooks/useAuthedCallback";

import { formatBalanceBN } from "utils/format";
import { getSDKPool, Pool } from "utils/poolUtils";
import SwapHoriz from "components/shared/Icons/SwapHoriz";
import { fromWei } from "utils/ethersUtils";

const MultiPoolPortal = memo(() => {
  const { width } = useWindowSize();

  // Determine the column width based on the width of the window.
  const columnWidth = width > 930 ? "900px" : width > 730 ? "700px" : "100%";

  return (
    <>
      <Column
        mainAxisAlignment="flex-start"
        crossAxisAlignment="center"
        color="#FFFFFF"
        mx="auto"
        width={columnWidth}
        px={columnWidth === "100%" ? 4 : 0}
      >
        <FundStats />

        <DashboardBox mt={4} width="100%" height="100px">
          <NewsAndTwitterLink />
        </DashboardBox>

        <DashboardBox
          mt={4}
          height="300px"
          width="100%"
          color="#292828"
          overflow="hidden"
          px={1}
        >
          <PoolsPerformanceChart size={300} />
        </DashboardBox>

        <DashboardBox
          width="100%"
          height={{ md: "100px", base: "250px" }}
          mt={4}
        >
          <GovernanceStats />
        </DashboardBox>

        <PoolCards />
      </Column>
    </>
  );
});

export default MultiPoolPortal;

export const RGTPrice = () => {
  const { t } = useTranslation();

  const { rari } = useRari();

  return (
    <RefetchMovingStat
      queryKey="rgtPrice"
      interval={5000}
      fetch={() => {
        return rari.governance.rgt.getExchangeRate().then((data: any) => {
          return stringUsdFormatter(fromWei(data));
        });
      }}
      loadingPlaceholder="$?"
      statSize="3xl"
      captionSize="xs"
      caption={t("Rari Governance Token Price")}
      crossAxisAlignment="center"
      captionFirst={false}
    />
  );
};

const GovernanceStats = () => {
  const { t } = useTranslation();

  const { rari, address } = useRari();

  const { data: rgtBalance } = useQuery(
    address + " balanceOf RGT",
    async () => {
      const rawBalance = await rari.governance.rgt.balanceOf(address);

      return stringUsdFormatter(fromWei(rawBalance)).replace("$", "");
    }
  );

  const { data: rgtSupply } = useQuery("rgtSupply", async () => {
    const rawSupply =
      //@ts-ignore
      await rari.governance.contracts.RariGovernanceToken.totalSupply();

    return smallStringUsdFormatter((parseFloat(rawSupply) / 1e18).toFixed(0))
      .replace("$", "")
      .replace(".00", "");
  });

  return (
    <RowOnDesktopColumnOnMobile
      expand
      mainAxisAlignment="space-around"
      crossAxisAlignment="center"
    >
      <Center expand>
        <CaptionedStat
          stat={rgtSupply ?? "?"}
          statSize="3xl"
          captionSize="xs"
          caption={t("RGT Supply")}
          crossAxisAlignment="center"
          captionFirst={false}
        />
      </Center>

      <Center expand>
        <RGTPrice />
      </Center>
      <Center expand>
        <CaptionedStat
          stat={rgtBalance ?? "$?"}
          statSize="3xl"
          captionSize="xs"
          caption={t("RGT Balance (Claimed)")}
          crossAxisAlignment="center"
          captionFirst={false}
        />
      </Center>
    </RowOnDesktopColumnOnMobile>
  );
};

const FundStats = () => {
  const { t } = useTranslation();

  const { isAuthed } = useRari();

  const { isLoading: isBalanceLoading, data: balanceData } =
    useTotalPoolsBalance();

  const { getNumberTVL } = useTVLFetchers();

  // If loading, stop here
  if (isBalanceLoading) {
    return (
      <Center
        height={{
          md: isAuthed ? "235px" : "110px",
          base: isAuthed ? "330px" : "215px",
        }}
      >
        <Spinner />
      </Center>
    );
  }

  const myBalance = balanceData!;
  const hasNotDeposited = myBalance === 0;

  return (
    <>
      {hasNotDeposited ? null : (
        <DashboardBox width="100%" mb={4} height="110px">
          <Center expand>
            <APYWithRefreshMovingStat
              formatStat={usdFormatter}
              fetchInterval={40000}
              loadingPlaceholder="$?"
              apyInterval={100}
              fetch={getNumberTVL}
              queryKey={"totalValueLocked"}
              apy={0.15}
              statSize="3xl"
              captionSize="xs"
              caption={t("Total Value Locked")}
              crossAxisAlignment="center"
              captionFirst={false}
            />
          </Center>
        </DashboardBox>
      )}

      <RowOnDesktopColumnOnMobile
        mainAxisAlignment="space-between"
        crossAxisAlignment="center"
        width="100%"
        height={{ md: "110px", base: "auto" }}
      >
        <DashboardBox
          width={{ md: hasNotDeposited ? "100%" : "50%", base: "100%" }}
          height={{ md: "100%", base: "110px" }}
          mr={{
            md: hasNotDeposited ? "0px" : 4,
            base: 0,
          }}
        >
          <Center expand>
            {hasNotDeposited ? (
              <APYWithRefreshMovingStat
                formatStat={usdFormatter}
                fetchInterval={40000}
                loadingPlaceholder="$?"
                apyInterval={100}
                fetch={getNumberTVL}
                queryKey={"totalValueLocked"}
                apy={0.15}
                statSize="3xl"
                captionSize="xs"
                caption={t("Total Value Locked")}
                crossAxisAlignment="center"
                captionFirst={false}
              />
            ) : (
              <APYMovingStat
                formatStat={usdFormatter}
                startingAmount={myBalance}
                interval={100}
                apy={0.1}
                statSize="3xl"
                captionSize="xs"
                caption={t("Account Balance")}
                crossAxisAlignment="center"
                captionFirst={false}
              />
            )}
          </Center>
        </DashboardBox>

        {hasNotDeposited ? null : (
          <DashboardBox
            mt={{ md: 0, base: 4 }}
            width={{ md: "50%", base: "100%" }}
            height={{ md: "100%", base: "100px" }}
          >
            <Center expand>
              <InterestEarned />
            </Center>
          </DashboardBox>
        )}
      </RowOnDesktopColumnOnMobile>
    </>
  );
};

const PoolCards = () => {
  return (
    <RowOnDesktopColumnOnMobile
      mainAxisAlignment="space-between"
      crossAxisAlignment="center"
      width="100%"
    >
      {Object.values(Pool).map((pool: Pool, index: number, array: Pool[]) => {
        return (
          <DashboardBox
            key={pool}
            width={{ md: "33%", base: "100%" }}
            height="280px"
            mr={{
              md:
                // Don't add right margin on the last child
                index === array.length - 1 ? 0 : 4,
              base: 0,
            }}
            mt={4}
          >
            <PoolDetailCard pool={pool} />
          </DashboardBox>
        );
      })}
    </RowOnDesktopColumnOnMobile>
  );
};

const PoolDetailCard = ({ pool }: { pool: Pool }) => {
  const { t } = useTranslation();

  const { rari, isAuthed } = useRari();

  const { poolType, poolName, poolLogo } = usePoolInfo(pool);

  const {
    isOpen: isDepositModalOpen,
    onOpen: openDepositModal,
    onClose: closeDepositModal,
  } = useDisclosure();

  const authedOpenModal = useAuthedCallback(openDepositModal);

  const { data: balanceData, isLoading: isPoolBalanceLoading } =
    usePoolBalance(pool);

  const poolAPY = usePoolAPY(pool);

  const noSlippageCurrencies = useNoSlippageCurrencies(pool);

  if (isPoolBalanceLoading) {
    return (
      <Center
        height={{
          md: isAuthed ? "235px" : "110px",
          base: isAuthed ? "330px" : "215px",
        }}
      >
        <Spinner />
      </Center>
    );
  }

  const myBalance = balanceData!;
  const formattedBalance = formatBalanceBN(rari, myBalance, pool === Pool.ETH);

  // const rgtAPR = useRGTAPR();

  return (
    <>
      {isDepositModalOpen ? (
        <PoolTypeProvider pool={pool}>
          <DepositModal
            isOpen={isDepositModalOpen}
            onClose={closeDepositModal}
          />
        </PoolTypeProvider>
      ) : null}
      <Column
        mainAxisAlignment="flex-start"
        crossAxisAlignment="center"
        expand
        p={4}
      >
        <Box width="50px" height="50px" flexShrink={0}>
          <Image src={poolLogo} />
        </Box>

        <Row mainAxisAlignment="center" crossAxisAlignment="center" mt={2}>
          <Heading fontSize="xl" lineHeight="2.3rem">
            {poolName}
          </Heading>

          <SimpleTooltip
            label={
              "Rebalances " +
              (noSlippageCurrencies
                ? noSlippageCurrencies.join(" + ")
                : " ? ") +
              " between " +
              getSDKPool({ rari, pool: poolType }).allocations.POOLS.join(", ")
            }
          >
            <QuestionIcon ml={2} mb="3px" boxSize="12px" />
          </SimpleTooltip>
        </Row>

        <SimpleTooltip label={t("Your balance in this pool")}>
          <Text mt={4} mb={5} fontSize="md" textAlign="center">
            {isPoolBalanceLoading ? "$?" : formattedBalance}
          </Text>
        </SimpleTooltip>

        <Text fontWeight="bold" textAlign="center">
          {poolAPY ?? "?"}% APY
          {/* +{" "}
          <SimpleTooltip label={t("Extra returns from $RGT")}>
            <span>
              ({rgtAPR ?? "?"}%{" "}
              <Image display="inline" src={SmallLogo} boxSize="20px" />)
            </span>
          </SimpleTooltip> */}
        </Text>

        <Row
          mainAxisAlignment="flex-start"
          crossAxisAlignment="center"
          width="100%"
          mt="auto"
        >
          <AppLink
            width="100%"
            className="no-underline"
            href={"/pools/" + pool.toString()}
          >
            <DashboardBox
              mt={4}
              width="100%"
              height="45px"
              borderRadius="7px"
              fontSize="xl"
              fontWeight="bold"
            >
              <Center expand>{t("Access")}</Center>
            </DashboardBox>
          </AppLink>

          <DashboardBox
            mt={4}
            flexShrink={0}
            as="button"
            onClick={authedOpenModal}
            height="45px"
            ml={2}
            width="45px"
            borderRadius="7px"
            fontSize="xl"
            fontWeight="bold"
          >
            <Center expand>
              <SwapHoriz />
            </Center>
          </DashboardBox>
        </Row>
      </Column>
    </>
  );
};

const InterestEarned = () => {
  const interestEarned = usePoolInterestEarned();

  const { data: yieldPoolBalance } = usePoolBalance(Pool.YIELD);

  const isSufferingDivergenceLoss = (() => {
    if (interestEarned && yieldPoolBalance) {
      if (
        interestEarned.yieldPoolInterestEarned.isZero() &&
        BigNumber.from(yieldPoolBalance.toString()).div(1e18).gt(20)
      ) {
        return true;
      } else {
        return false;
      }
    }
  })();

  const { t } = useTranslation();

  return (
    <Column mainAxisAlignment="center" crossAxisAlignment="center">
      <Heading fontSize="3xl">
        {interestEarned?.totalFormattedEarnings ?? "$?"}
      </Heading>

      {isSufferingDivergenceLoss ? (
        <SimpleTooltip
          label={t(
            "You may experience divergence loss when depositing stablecoins into the Yield Pool that are above their peg at the time of deposit. The Yield Pool is composed of various stablecoins which shift in value, causing your balance to fluctuate."
          )}
        >
          <Text
            textTransform="uppercase"
            letterSpacing="wide"
            color="#858585"
            fontSize="xs"
            textAlign="center"
          >
            {t("Interest Earned")}

            <InfoIcon ml="5px" boxSize="10px" mb="3px" />
          </Text>
        </SimpleTooltip>
      ) : (
        <Text
          textTransform="uppercase"
          letterSpacing="wide"
          color="#858585"
          fontSize="xs"
          textAlign="center"
        >
          {t("Interest Earned")}
        </Text>
      )}
    </Column>
  );
};

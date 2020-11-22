import React, { useCallback, useMemo, useState } from "react";
import {
  Box,
  Text,
  Heading,
  Spinner,
  Divider,
  Select,
  useDisclosure,
  theme,
  BoxProps,
  Image,
  Link,
} from "@chakra-ui/react";
import { useRari } from "../../context/RariContext";

import SmallRGTLogo from "../../static/small-logo.png";

import DashboardBox, {
  DASHBOARD_BOX_SPACING,
  DASHBOARD_BOX_PROPS,
} from "../shared/DashboardBox";

import CopyrightSpacer from "../shared/CopyrightSpacer";

import Chart from "react-apexcharts";

import FullPageSpinner from "../shared/FullPageSpinner";

import {
  Column,
  Row,
  Center,
  useLockedViewHeight,
  useSpacedLayout,
  RowOnDesktopColumnOnMobile,
  PercentageSize,
  ResponsivePixelSize,
  PixelSize,
  PercentOnDesktopPixelOnMobileSize,
} from "buttered-chakra";

import {
  SelfReturnChartOptions,
  StrategyAllocationChartOptions,
  DisableChartInteractions,
} from "../../utils/chartOptions";
import CaptionedStat from "../shared/CaptionedStat";

import ProgressBar from "../shared/ProgressBar";

import DepositModal from "./DepositModal";
import { useQuery } from "react-query";

import { useTranslation } from "react-i18next";

import { Pool, PoolTypeProvider, usePoolType } from "../../context/PoolContext";
import { usePoolInfoFromContext } from "../../hooks/usePoolInfo";
import { Header, HeaderHeightWithTopPadding } from "../shared/Header";
import ForceAuthModal from "../shared/ForceAuthModal";

import { GlowingButton } from "../shared/GlowingButton";

import { usePoolBalance } from "../../hooks/usePoolBalance";
import { BN, stringUsdFormatter } from "../../utils/bigUtils";
import { SimpleTooltip } from "../shared/SimpleTooltip";
import { getSDKPool } from "../../utils/poolUtils";
import { fetchRGTAPR, usePoolAPY } from "../../hooks/usePoolAPY";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import { tokens } from "../../utils/tokenUtils";

const millisecondsPerDay = 86400000;

const PoolPortal = React.memo(({ pool }: { pool: Pool }) => {
  return (
    <PoolTypeProvider pool={pool}>
      <PoolPortalContent />
    </PoolTypeProvider>
  );
});

export default PoolPortal;

const PoolPortalContent = React.memo(() => {
  const { isAuthed } = useRari();

  const { windowHeight, isLocked } = useLockedViewHeight({
    min: 750,
    max: 1900,
  });

  const {
    childSizes: [, bodySize],
  } = useSpacedLayout({
    parentHeight: windowHeight.asNumber(),
    spacing: DASHBOARD_BOX_SPACING.asNumber(),
    childSizes: [
      HeaderHeightWithTopPadding,
      new PercentageSize(1),
      // We have a 0 sized child here because it will now lower the size of the "100%" child
      // by accouting for padding below it, which is 15.
      new PixelSize(0),
    ],
  });

  const {
    spacing: statsSidebarSpacing,
    childSizes: statsSidebarChildSizes,
  } = useSpacedLayout({
    parentHeight: bodySize.asNumber(),
    spacing: DASHBOARD_BOX_SPACING.asNumber(),
    childSizes: [
      new PixelSize(90),
      new PixelSize(100),
      new PixelSize(152),
      new PixelSize(180),
      new PercentOnDesktopPixelOnMobileSize({
        percentageSize: 1,
        pixelSize: 100,
      }),
    ],
  });

  const {
    spacing: mainSectionSpacing,
    childSizes: mainSectionChildSizes,
  } = useSpacedLayout({
    parentHeight: bodySize.asNumber(),
    spacing: DASHBOARD_BOX_SPACING.asNumber(),
    childSizes: [
      new PixelSize(90),
      new PercentOnDesktopPixelOnMobileSize({
        percentageSize: 1,
        pixelSize: 600,
      }),
      new PixelSize(180),
    ],
  });

  const { poolName, poolType } = usePoolInfoFromContext();

  const { balanceData, isPoolBalanceLoading } = usePoolBalance(poolType);

  const {
    isOpen: isDepositModalOpen,
    onOpen: openDepositModal,
    onClose: closeDepositModal,
  } = useDisclosure();

  const { t } = useTranslation();

  if (isPoolBalanceLoading) {
    return <FullPageSpinner />;
  }

  const { formattedBalance: myBalance } = balanceData!;
  const hasNotDeposited = myBalance === "$0.00000";

  return (
    <>
      <ForceAuthModal />

      <DepositModal isOpen={isDepositModalOpen} onClose={closeDepositModal} />

      <Column
        mainAxisAlignment="flex-start"
        crossAxisAlignment="flex-start"
        color="#FFFFFF"
      >
        <Header isPool padding isAuthed={isAuthed} />
        <RowOnDesktopColumnOnMobile
          mainAxisAlignment="flex-start"
          crossAxisAlignment="center"
          width="100%"
          px={DASHBOARD_BOX_SPACING.asPxString()}
          height={{ md: bodySize.asPxString(), base: "auto" }}
        >
          <Column
            mainAxisAlignment="flex-start"
            crossAxisAlignment="center"
            height={{ md: "100%", base: "auto" }}
            width={{ md: "100%", base: "100%" }}
          >
            <DashboardBox
              width="100%"
              mb={mainSectionSpacing.asPxString()}
              height={{
                md: mainSectionChildSizes[0].asPxString(),
                base: "auto",
              }}
              overflowX="auto"
              whiteSpace="nowrap"
            >
              <RowOnDesktopColumnOnMobile
                expand
                mainAxisAlignment="space-between"
                crossAxisAlignment="center"
                p={DASHBOARD_BOX_SPACING.asPxString()}
              >
                <Column
                  mainAxisAlignment="center"
                  crossAxisAlignment={{ md: "flex-start", base: "center" }}
                  height="100%"
                  mb={{ md: 0, base: DASHBOARD_BOX_SPACING.asPxString() }}
                >
                  <Heading
                    fontFamily={`'Baloo 2', ${theme.fonts.heading}`}
                    fontSize={{ md: 27, base: "xl" }}
                  >
                    {poolName}
                  </Heading>
                  <Text fontSize="xs">
                    {poolType === Pool.STABLE
                      ? t("Safe returns on stablecoins")
                      : poolType === Pool.ETH
                      ? t("Safe returns on ETH")
                      : t("High risk, high reward")}
                  </Text>
                </Column>

                <DepositButton onClick={openDepositModal} />
              </RowOnDesktopColumnOnMobile>
            </DashboardBox>

            <DashboardBox
              width="100%"
              mb={mainSectionSpacing.asPxString()}
              height={mainSectionChildSizes[1].asPxString()}
              position="relative"
            >
              {hasNotDeposited ? (
                <DepositButton
                  zIndex={1}
                  transform="translate(-50%, -50%)"
                  position="absolute"
                  top="50%"
                  left="50%"
                  onClick={openDepositModal}
                />
              ) : null}

              <Box opacity={hasNotDeposited ? 0.2 : 1} height="100%">
                <UserStatsAndChart
                  hasNotDeposited={hasNotDeposited}
                  size={mainSectionChildSizes[1].asNumber()}
                  balance={myBalance}
                />
              </Box>
            </DashboardBox>

            <RowOnDesktopColumnOnMobile
              mainAxisAlignment="flex-start"
              crossAxisAlignment="center"
              height={{
                md: mainSectionChildSizes[2].asPxString(),
                base: "auto",
              }}
              width="100%"
            >
              {poolType !== Pool.ETH ? (
                <DashboardBox
                  mr={{
                    md: DASHBOARD_BOX_SPACING.asPxString(),
                    base: 0,
                  }}
                  mb={{ md: 0, base: DASHBOARD_BOX_SPACING.asPxString() }}
                  height={mainSectionChildSizes[2].asPxString()}
                  width={{ md: "50%", base: "100%" }}
                  pt={DASHBOARD_BOX_SPACING.asPxString()}
                  px={DASHBOARD_BOX_SPACING.asPxString()}
                >
                  <TokenAllocation />
                </DashboardBox>
              ) : null}

              <DashboardBox
                height={mainSectionChildSizes[2].asPxString()}
                width={
                  poolType === Pool.ETH ? "100%" : { md: "50%", base: "100%" }
                }
                pt={DASHBOARD_BOX_SPACING.asPxString()}
                px={DASHBOARD_BOX_SPACING.asPxString()}
              >
                <RecentTrades />
              </DashboardBox>
            </RowOnDesktopColumnOnMobile>
          </Column>

          <Column
            mainAxisAlignment="flex-start"
            crossAxisAlignment="center"
            flexShrink={0}
            height={{ md: "100%", base: "auto" }}
            width={{ md: "260px", base: "100%" }}
            pt={{ md: 0, base: DASHBOARD_BOX_SPACING.asPxString() }}
            pl={{ md: DASHBOARD_BOX_SPACING.asPxString(), base: 0 }}
          >
            <DashboardBox
              width="100%"
              mb={statsSidebarSpacing.asPxString()}
              height={statsSidebarChildSizes[0].asPxString()}
              bg="#FFFFFF"
              color="#000000"
            >
              <CurrentAPY />
            </DashboardBox>

            <DashboardBox
              width="100%"
              mb={statsSidebarSpacing.asPxString()}
              height={statsSidebarChildSizes[1].asPxString()}
              p={DASHBOARD_BOX_SPACING.asPxString()}
            >
              <APYStats />
            </DashboardBox>

            <DashboardBox
              width="100%"
              mb={statsSidebarSpacing.asPxString()}
              height={statsSidebarChildSizes[2].asPxString()}
              pt={DASHBOARD_BOX_SPACING.asPxString()}
              px={DASHBOARD_BOX_SPACING.asPxString()}
            >
              <StrategyAllocation />
            </DashboardBox>

            <DashboardBox
              width="100%"
              height={statsSidebarChildSizes[3].asPxString()}
              mb={statsSidebarSpacing.asPxString()}
              pt={DASHBOARD_BOX_SPACING.asPxString()}
              px={DASHBOARD_BOX_SPACING.asPxString()}
            >
              <MonthlyReturns />
            </DashboardBox>

            <DashboardBox
              width="100%"
              height={statsSidebarChildSizes[4].asPxString()}
            >
              <TransactionHistory />
            </DashboardBox>
          </Column>
        </RowOnDesktopColumnOnMobile>

        <CopyrightSpacer forceShow={isLocked} />
      </Column>
    </>
  );
});

const UserStatsAndChart = React.memo(
  ({
    size,
    balance,

    hasNotDeposited,
  }: {
    size: number;
    balance: string;
    hasNotDeposited: boolean;
  }) => {
    const { address, rari } = useRari();

    const { poolType, poolName } = usePoolInfoFromContext();

    const [timeRange, setTimeRange] = useState("week");

    const onTimeRangeChange = useCallback(
      (event: React.ChangeEvent<HTMLSelectElement>) => {
        setTimeRange(event.target.value);
      },
      [setTimeRange]
    );

    const {
      childSizes: [topPadding, statsSize, chartSize],
    } = useSpacedLayout({
      parentHeight: size,
      spacing: 0,
      childSizes: [
        // Add this to account for 5px top padding
        new PixelSize(5),
        new ResponsivePixelSize({ desktop: 75, mobile: 230 }),
        new PercentageSize(1),
        // Add this to account for 5px bottom padding
        new PixelSize(5),
      ],
    });

    const {
      data: interestEarned,
      isLoading: isInterestEarnedLoading,
    } = useQuery(
      address + " " + poolType + " interestAccrued " + timeRange,
      async () => {
        const latestBlock = await rari.web3.eth.getBlockNumber();

        const blocksPerDay = 6594;

        const startingBlock =
          timeRange === "month"
            ? latestBlock - blocksPerDay * 30
            : timeRange === "year"
            ? latestBlock - blocksPerDay * 365
            : timeRange === "week"
            ? latestBlock - blocksPerDay * 7
            : 0;

        const interestRaw = await getSDKPool({
          rari,
          pool: poolType,
        }).balances.interestAccruedBy(address, startingBlock);

        const formattedInterest = stringUsdFormatter(
          rari.web3.utils.fromWei(interestRaw)
        );

        return poolType === Pool.ETH
          ? formattedInterest.replace("$", "") + " ETH"
          : formattedInterest;
      }
    );

    const { data: chartData, isLoading: isChartDataLoading } = useQuery(
      address + " " + poolType + " balanceHistory",
      async () => {
        const millisecondStart =
          timeRange === "month"
            ? Date.now() - millisecondsPerDay * 30
            : timeRange === "year"
            ? Date.now() - millisecondsPerDay * 365
            : timeRange === "week"
            ? Date.now() - millisecondsPerDay * 7
            : 0;

        try {
          const rawData = await getSDKPool({
            rari,
            pool: poolType,
          }).history.getBalanceHistoryOf(
            address,
            Math.floor(millisecondStart / 1000)
          );

          // TODO: REMOVE THIS ONCE DAVID FIXES INTERVAL SECONDS HANDLING!!!
          return rawData.slice(0, 200);
        } catch (e) {
          console.log(e);
        }
      }
    );

    const poolAPY = usePoolAPY(poolType);

    const { t } = useTranslation();

    return (
      <>
        <RowOnDesktopColumnOnMobile
          mainAxisAlignment={{ md: "space-between", base: "space-around" }}
          crossAxisAlignment="center"
          px={DASHBOARD_BOX_SPACING.asPxString()}
          mt={{ md: topPadding.asPxString(), base: 0 }}
          height={statsSize.asPxString()}
          width="100%"
        >
          {hasNotDeposited ? (
            <CaptionedStat
              crossAxisAlignment={{ md: "flex-start", base: "center" }}
              caption={t("Current earning")}
              captionSize="xs"
              stat={(poolAPY ?? "?") + "% APY"}
              statSize="4xl"
            />
          ) : (
            <>
              <CaptionedStat
                crossAxisAlignment={{ md: "flex-start", base: "center" }}
                caption={t("Account Balance")}
                captionSize="xs"
                stat={balance}
                statSize="3xl"
              />

              <CaptionedStat
                crossAxisAlignment={{ md: "flex-start", base: "center" }}
                caption={t("Interest Earned")}
                captionSize="xs"
                stat={isInterestEarnedLoading ? "$?" : interestEarned!}
                statSize="3xl"
              />
            </>
          )}

          <Select
            {...DASHBOARD_BOX_PROPS}
            borderRadius="7px"
            fontWeight="bold"
            width={{ md: "130px", base: "100%" }}
            isDisabled={hasNotDeposited}
            value={timeRange}
            onChange={onTimeRangeChange}
          >
            <option value="week">{t("Week")}</option>
            <option value="month">{t("Month")}</option>
            <option value="year">{t("Year")}</option>
            <option value="max">{t("Max")}</option>
          </Select>
        </RowOnDesktopColumnOnMobile>

        <Box height={chartSize.asPxString()} color="#000000" overflow="hidden">
          {isChartDataLoading && !hasNotDeposited ? (
            <Center expand>
              <Spinner color="#FFF" />
            </Center>
          ) : (
            <Chart
              options={
                hasNotDeposited
                  ? { ...SelfReturnChartOptions, ...DisableChartInteractions }
                  : SelfReturnChartOptions
              }
              type="line"
              width="100%"
              height="100%"
              series={[
                {
                  name: poolName,
                  data: hasNotDeposited
                    ? [
                        { x: "October 1, 2020", y: 1000 },
                        { x: "October 3, 2020", y: 1001 },
                        { x: "October 4, 2020", y: 1003 },
                        { x: "October 5, 2020", y: 1005 },
                        { x: "October 6, 2020", y: 1006 },
                        { x: "October 7, 2020", y: 1007 },
                        { x: "October 8, 2020", y: 1010 },
                        { x: "October 9, 2020", y: 1012 },
                        { x: "October 10, 2020", y: 1014 },
                        { x: "October 11, 2020", y: 1016 },
                        { x: "October 12, 2020", y: 1018 },
                      ]
                    : (chartData ?? []).map((point: any) => ({
                        x: new Date(point.timestamp).toLocaleDateString(
                          "en-US"
                        ),
                        y: (parseFloat(point.balance) / 1e18).toFixed(2),
                      })),
                },
              ]}
            />
          )}
        </Box>
      </>
    );
  }
);

const CurrentAPY = React.memo(() => {
  const { t } = useTranslation();

  const poolType = usePoolType();

  const poolAPY = usePoolAPY(poolType);

  return (
    <Row expand mainAxisAlignment="center" crossAxisAlignment="center">
      <Heading
        mt="5px"
        fontFamily={`'Baloo 2', ${theme.fonts.heading}`}
        fontSize="54px"
        fontWeight="extrabold"
      >
        {poolAPY ? poolAPY.slice(0, -1) + "%" : <Spinner size="lg" mr={4} />}
      </Heading>
      <Text ml={3} width="65px" fontSize="sm" textTransform="uppercase">
        {t("Current APY")}
      </Text>
    </Row>
  );
});

const APYStats = React.memo(() => {
  const { t } = useTranslation();

  const pool = usePoolType();

  const { rari } = useRari();

  const { data: apys, isLoading: areAPYsLoading } = useQuery(
    pool + " monthly and weekly apys",
    async () => {
      const [monthRaw, weekRaw, rgtAPR]: [BN, BN, string] = await Promise.all([
        getSDKPool({
          rari,
          pool,
        }).apy.getApyOverTime(
          Math.floor((Date.now() - millisecondsPerDay * 30) / 1000)
        ),
        getSDKPool({
          rari,
          pool,
        }).apy.getApyOverTime(
          Math.floor((Date.now() - millisecondsPerDay * 7) / 1000)
        ),
        fetchRGTAPR(rari),
      ]);

      const month = parseFloat(
        rari.web3.utils.fromWei(monthRaw.mul(rari.web3.utils.toBN(100)))
      ).toFixed(1);

      const week = parseFloat(
        rari.web3.utils.fromWei(weekRaw.mul(rari.web3.utils.toBN(100)))
      ).toFixed(1);

      return { month, week, rgtAPR };
    }
  );

  return (
    <Column
      expand
      mainAxisAlignment="space-between"
      crossAxisAlignment="flex-start"
    >
      <Heading lineHeight={1} size="xs">
        {t("APY Based On Returns From")}:
      </Heading>

      <Column
        mainAxisAlignment="flex-start"
        crossAxisAlignment="flex-start"
        width="100%"
      >
        <Row
          mainAxisAlignment="space-between"
          crossAxisAlignment="center"
          width="100%"
        >
          <Text fontSize="sm">
            {t("This Month")}: <b>{areAPYsLoading ? "?" : apys!.month}%</b>
          </Text>

          <Text fontWeight="bold" textAlign="center">
            <SimpleTooltip label={t("Extra yield from $RGT")}>
              <span>
                + ({areAPYsLoading ? "?" : apys!.rgtAPR}%{" "}
                <Image display="inline" src={SmallRGTLogo} boxSize="20px" />)
              </span>
            </SimpleTooltip>
          </Text>
        </Row>
        <Row
          mainAxisAlignment="space-between"
          crossAxisAlignment="center"
          width="100%"
        >
          <Text fontSize="sm">
            {t("This Week")}: <b>{areAPYsLoading ? "?" : apys!.week}%</b>
          </Text>

          <Text fontWeight="bold" textAlign="center">
            <SimpleTooltip label={t("Extra yield from $RGT")}>
              <span>
                + ({areAPYsLoading ? "?" : apys!.rgtAPR}%{" "}
                <Image display="inline" src={SmallRGTLogo} boxSize="20px" />)
              </span>
            </SimpleTooltip>
          </Text>
        </Row>
      </Column>
    </Column>
  );
});

const StrategyAllocation = React.memo(() => {
  const { t } = useTranslation();

  const { rari } = useRari();

  const poolType = usePoolType();

  const { data: allocations, isLoading: isAllocationsLoading } = useQuery(
    poolType + "allocations",
    async () => {
      const rawAllocations: { [key: string]: BN } = await getSDKPool({
        rari,
        pool: poolType,
      }).allocations.getRawPoolAllocations();

      let allocations: { [key: string]: number } = {};

      for (const [token, amount] of Object.entries(rawAllocations)) {
        if (token === "_cash") {
          continue;
        }

        const parsedAmount = parseFloat(rari.web3.utils.fromWei(amount));

        if (parsedAmount > 5) {
          allocations[token] = parsedAmount;
        }
      }

      const keys = Object.keys(allocations);

      const values: number[] = [];

      keys.forEach((key) => values.push(allocations[key]));

      return [keys, values];
    }
  );

  return (
    <Column
      mainAxisAlignment="flex-start"
      crossAxisAlignment={{
        md: "flex-start",
        base: "center",
      }}
      expand
    >
      <Heading lineHeight={1} size="sm" mb={1}>
        {t("Strategy Allocation")}
      </Heading>

      {isAllocationsLoading ? (
        <Center expand>
          <Spinner />
        </Center>
      ) : (
        <Chart
          options={{
            ...StrategyAllocationChartOptions,
            labels: allocations![0],
          }}
          type="pie"
          width="100%"
          height="110px"
          series={allocations![1]}
        />
      )}
    </Column>
  );
});

const MonthlyReturns = React.memo(() => {
  const ethPoolAPY = usePoolAPY(Pool.ETH);
  const stablePoolAPY = usePoolAPY(Pool.STABLE);
  const yieldPoolAPY = usePoolAPY(Pool.YIELD);

  const returns: { [key: string]: number } | null =
    ethPoolAPY && stablePoolAPY && yieldPoolAPY
      ? {
          "ETH Pool": parseFloat(ethPoolAPY!),
          "Stable Pool": parseFloat(stablePoolAPY!),
          "Yield Pool": parseFloat(yieldPoolAPY!),
        }
      : null;

  const sortedEntries = returns
    ? Object.entries(returns)
        // Sort descendingly by highest APY
        .sort((a, b) => b[1] - a[1])
    : null;

  const { t } = useTranslation();

  return (
    <Column
      mainAxisAlignment="flex-start"
      crossAxisAlignment="flex-start"
      expand
      overflowY="hidden"
    >
      <Heading size="sm" lineHeight={1} mb={3}>
        {t("Compare Returns")}
      </Heading>

      {sortedEntries ? (
        sortedEntries.map(([key, value]) => {
          const highestAPY = sortedEntries[0][1];
          return (
            <Column
              key={key}
              width="100%"
              mainAxisAlignment="flex-start"
              crossAxisAlignment="flex-end"
              mb={3}
            >
              <Row
                mainAxisAlignment="space-between"
                crossAxisAlignment="center"
                width="100%"
                mb={1}
              >
                <Text color="#CACACA" fontSize={12}>
                  {key}
                </Text>
                <Text color="#CACACA" fontSize={12}>
                  {value ?? "?"}%
                </Text>
              </Row>

              <ProgressBar
                percentageFilled={
                  // Fill it relative to the highest APY
                  value / highestAPY
                }
              />
            </Column>
          );
        })
      ) : (
        <Center expand>
          <Spinner />
        </Center>
      )}
    </Column>
  );
});

const TokenAllocation = React.memo(() => {
  const { rari } = useRari();
  const poolType = usePoolType();

  const { data: allocations } = useQuery(
    poolType + " currencyAllocations",
    async () => {
      const currencyAllocations: {
        [key: string]: BN;
      } = await getSDKPool({
        rari,
        pool: poolType,
      }).allocations.getRawCurrencyAllocations();

      let dollarAmountAllocations: { [key: string]: number } = {};

      Object.keys(currencyAllocations).forEach((symbol) => {
        dollarAmountAllocations[symbol] =
          parseFloat(currencyAllocations[symbol].toString()) /
          10 ** tokens[symbol].decimals;
      });

      return dollarAmountAllocations;
    }
  );

  const sortedEntries = allocations
    ? Object.entries(allocations)
        // Sort descendingly by the largest
        .sort((a, b) => b[1] - a[1])
    : null;

  const maxAmount = useMemo(() => {
    if (sortedEntries) {
      return sortedEntries.reduce((a, b) => {
        return a + b[1];
      }, 0);
    } else {
      return null;
    }
  }, [sortedEntries]);

  const { t } = useTranslation();

  return (
    <Column
      mainAxisAlignment="flex-start"
      crossAxisAlignment="flex-start"
      expand
      overflowY="scroll"
    >
      <Heading size="md" lineHeight={1}>
        {t("Token Allocation")}
      </Heading>

      {sortedEntries && maxAmount ? (
        sortedEntries.slice(0, 4).map(([symbol, amount]) => {
          const percentageOfMax = amount / maxAmount;

          return (
            <Column
              key={symbol}
              width="100%"
              mainAxisAlignment="flex-start"
              crossAxisAlignment="flex-end"
              mb="10px"
            >
              <Text color="#CACACA" fontSize={10}>
                {symbol}
              </Text>
              <ProgressBar percentageFilled={percentageOfMax} />
            </Column>
          );
        })
      ) : (
        <Center expand>
          <Spinner />
        </Center>
      )}
    </Column>
  );
});

const RecentTrades = React.memo(() => {
  const recentTrades = [
    {
      transactionHash: "XXXXX",
      timeSent: "01/6/2020",
      returnValues: { percent: 0.4, from: "dYdX DAI", to: "Compound DAI" },
    },
    {
      transactionHash: "YYYYYY",
      timeSent: "01/6/2020",
      returnValues: { percent: 0.6, from: "Compound BAT", to: "dYdX DAI" },
    },
    {
      transactionHash: "ZZZZZZ",
      timeSent: "01/5/2020",
      returnValues: { percent: 0.3, from: "Compound USDT", to: "dYdX ZRX" },
    },
    {
      transactionHash: "AAAAAAA",
      timeSent: "01/5/2020",
      returnValues: { percent: 0.1, from: "dYdX REP", to: "Compound USDC" },
    },
    {
      transactionHash: "BBBBBB",
      timeSent: "01/4/2020",
      returnValues: {
        percent: 0.25,
        from: "Compound ETH",
        to: "Compound USDC",
      },
    },
  ];

  const { t } = useTranslation();

  const tradesLoading = false;

  return tradesLoading ? (
    <Center expand>
      <Spinner />
    </Center>
  ) : (
    <Column
      mainAxisAlignment="flex-start"
      crossAxisAlignment="flex-start"
      expand
      overflowY="auto"
    >
      <Heading size="md" lineHeight={1} mb={2}>
        {t("Recent Trades")}
      </Heading>

      {recentTrades!.map((event, index) => (
        <Box key={event.transactionHash} width="100%">
          <Text fontSize="sm" color="#aba6a6">
            {`${t("Move")} ${event.returnValues.percent * 100}% ${t("from")} ${
              event.returnValues.from
            } ${t("to")} ${event.returnValues.to}`}
            <b> ({event.timeSent})</b>
          </Text>
          {index !== recentTrades!.length - 1 ? (
            <Divider borderColor="#616161" my={1} />
          ) : (
            <Box height="10px" />
          )}
        </Box>
      ))}
    </Column>
  );
});

const TransactionHistory = React.memo(() => {
  const { t } = useTranslation();

  const poolType = usePoolType();

  const { rari, address } = useRari();

  const poolAddress: string = getSDKPool({ rari, pool: poolType }).contracts //@ts-ignore
    .RariFundToken.options.address;

  return (
    <Link
      href={`https://etherscan.io/token/${poolAddress}?a=${address}`}
      isExternal
    >
      <Column
        expand
        mainAxisAlignment="center"
        crossAxisAlignment="center"
        textAlign="center"
        fontWeight="bold"
        fontSize="md"
      >
        <ExternalLinkIcon boxSize="18px" mb="6px" />
        {t("View Transaction History")}
      </Column>
    </Link>
  );
});

const DepositButton = React.memo(
  (
    props: BoxProps & {
      onClick: () => any;
    }
  ) => {
    const { t } = useTranslation();

    return (
      <GlowingButton
        label={t("Deposit")}
        width="170px"
        height="50px"
        {...props}
      />
    );
  }
);

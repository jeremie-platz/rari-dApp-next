import { Text } from "@chakra-ui/layout";
import { Spinner } from "@chakra-ui/spinner";
import { Avatar, Center, Stack } from "@chakra-ui/react";
import AppLink from "components/shared/AppLink";
import { ModalDivider } from "components/shared/Modal";
import { Box, Table, Tbody, Td, Thead, Tr } from "@chakra-ui/react";

// Hooks
import useSWR from "swr";
import { useTranslation } from "next-i18next";

// Utils
import { Column, Row, useIsMobile } from "lib/chakraUtils";

// Types
import { RariApiTokenData, TokensDataMap } from "types/tokens";
import { queryAllUnderlyingAssets } from "services/gql";
import { SubgraphUnderlyingAsset } from "pages/api/explore";
import { fetchTokensAPIDataAsMap } from "utils/services";
import { useSortableList } from "hooks/useSortableList";
import { SortableTableHeader } from "./Common";
import { shortUsdFormatter, smallUsdFormatter } from "utils/bigUtils";

export const AllAssetsList = ({
  assets,
  tokensData,
}: {
  assets: SubgraphUnderlyingAsset[];
  tokensData: TokensDataMap;
}) => {
  const isMobile = useIsMobile();
  const { t } = useTranslation();

  const {
    sorted: sortedAssets,
    handleSortClick,
    sortBy,
    sortDir,
  } = useSortableList(assets);

  return (
    <Box h="400px" w="100%" overflowY="scroll">
      {!sortedAssets.length ? (
        <Box w="100%" h="50px">
          <Center>
            <Spinner my={8} />
          </Center>
        </Box>
      ) : (
        <Table variant="unstyled">
          <Thead position="sticky" top={0} left={0} bg="#121212" zIndex={10}>
            <Tr>
              <SortableTableHeader
                text="Asset"
                sortDir={sortDir}
                handleSortClick={() => handleSortClick("symbol")}
                isActive={sortBy === "symbol"}
              />

              {isMobile ? null : (
                <>
                  <SortableTableHeader
                    text="Total Supplied"
                    sortDir={sortDir}
                    handleSortClick={() => handleSortClick("totalSupplyUSD")}
                    isActive={sortBy === "totalSupplyUSD"}
                  />

                  <SortableTableHeader
                    text="Total Borrowed"
                    sortDir={sortDir}
                    handleSortClick={() => handleSortClick("totalBorrowUSD")}
                    isActive={sortBy === "totalBorrowUSD"}
                  />

                  <SortableTableHeader
                    text="Total Liquidity"
                    sortDir={sortDir}
                    handleSortClick={() => handleSortClick("totalLiquidityUSD")}
                    isActive={sortBy === "totalLiquidityUSD"}
                  />
                  {/* 
                <SortableTableHeader
                  text="Price"
                  sortDir={sortDir}
                  handleSortClick={() => handleSortClick("price")}
                  isActive={sortBy === "price"}
                /> */}
                </>
              )}
            </Tr>
          </Thead>
          <Tbody>
            {sortedAssets.map((underlyingAsset) => {
              return (
                <>
                  <AssetRow
                    asset={underlyingAsset}
                    tokenData={tokensData[underlyingAsset.id]}
                    key={underlyingAsset.symbol}
                  />
                  <ModalDivider />
                </>
              );
            })}
          </Tbody>
        </Table>
      )}
    </Box>
  );
};

export const AssetRow = ({
  asset,
  tokenData,
  ...rowProps
}: {
  asset: SubgraphUnderlyingAsset;
  tokenData?: RariApiTokenData;
  [x: string]: any;
}) => {
  const isMobile = useIsMobile();

  return (
    <AppLink
      href={`/token/${asset.id}`}
      as={Tr}
      className="hover-row no-underline"
      width="100%"
      {...rowProps}
    >
      {/* Pool */}
      <Td>
        <Row
          py={2}
          width={isMobile ? "100%" : "40%"}
          height="100%"
          mainAxisAlignment="flex-start"
          crossAxisAlignment="center"
        >
          <Avatar src={tokenData?.logoURL} boxSize={10} />
          <Text ml={2} fontWeight="bold">
            {asset.symbol}
          </Text>
        </Row>
      </Td>

      {isMobile ? null : (
        <>
          {/* Total Supply*/}
          <Td isNumeric={true}>
            <Stack direction="column">
              <Text fontWeight="bold">
                {asset.totalSupplyUSD &&
                  smallUsdFormatter(asset.totalSupplyUSD)}
              </Text>
              <Text fontWeight="" fontSize="sm">
                {asset.totalSupply &&
                  `${(asset.totalSupply / 10 ** asset.decimals).toFixed(2)} ${
                    asset.symbol
                  }`}
              </Text>
            </Stack>
          </Td>
          {/* Total Borrow */}
          <Td isNumeric={true}>
            <Stack direction="column">
              <Text fontWeight="bold">
                {asset.totalBorrowUSD &&
                  smallUsdFormatter(asset.totalBorrowUSD)}
              </Text>
              <Text fontWeight="" fontSize="sm">
                {asset.totalBorrow &&
                  `${(asset.totalBorrow / 10 ** asset.decimals).toFixed(2)} ${
                    asset.symbol
                  }`}
              </Text>
            </Stack>
          </Td>
          {/* Total Liquidity */}
          <Td isNumeric={true}>
            <Stack direction="column">
              <Text fontWeight="bold">
                {asset.totalLiquidityUSD &&
                  smallUsdFormatter(asset.totalLiquidityUSD).substring(0, 15)}
              </Text>
              {/* <Text fontWeight="" fontSize="sm">
                {(asset.totalLiquidity / 10 ** asset.decimals).toFixed(2)}{" "}
                {asset.symbol}
              </Text> */}
            </Stack>
          </Td>
          {/* Price
          <Td isNumeric={true} fontWeight="bold">
            {smallUsdFormatter(asset.price / 10 ** asset.decimals)}
          </Td> */}
        </>
      )}
    </AppLink>
  );
};

import gql from "graphql-tag";
import { GQLCToken } from "types/gql";

type NoUndefinedField<T> = {
  [P in keyof T]-?: NoUndefinedField<NonNullable<T[P]>>;
};
export type BestCTokenForUnderlying = NoUndefinedField<
  Pick<GQLCToken, "id" | "supplyAPY" | "borrowAPR" | "pool">
>;

export interface GQLBestCTokenForUnderlyings {
  bestSupplyAPY: BestCTokenForUnderlying[];
  bestBorrowAPR: BestCTokenForUnderlying[];
}

export const GET_BEST_CTOKENS_FOR_UNDERLYING = gql`
  query GetBestCTokensForUnderlying($tokenAddress: String!) {
    bestSupplyAPY: ctokens(
      where: { underlying: $tokenAddress }
      orderBy: supplyAPY
      orderDirection: desc
      first: 1
    ) {
      id
      supplyAPY
      borrowAPR
      pool {
        id
        name
        index
      }
    }
    bestBorrowAPR: ctokens(
      where: { underlying: $tokenAddress }
      orderBy: borrowAPR
      orderDirection: asc
      first: 1
    ) {
      id
      supplyAPY
      borrowAPR
      pool {
        id
        name
        index
      }
    }
  }
`;

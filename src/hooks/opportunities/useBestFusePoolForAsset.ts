import { useFuseDataForAsset } from "hooks/fuse/useFuseDataForAsset";
import {  useMemo, } from "react";
import {
  FusePoolData,
  USDPricedFuseAssetWithTokenData,
} from "utils/fetchFusePoolData";
import ethers, {BigNumber} from 'ethers'


interface BestPoolForAssetReturn {
  bestPool: FusePoolData | undefined;
  poolAssetIndex: number | undefined;
}

// For an Asset, returns the best Fuse Pool AND the index of that asset in that Fuse Pool.
export const useBestFusePoolForAsset = (
  tokenAddress?: string
): BestPoolForAssetReturn => {

  // Get all the Fuse pools with this Asset
  const fuseData = useFuseDataForAsset(tokenAddress);

  // Get the best possible Fuse pool and asset details for this token
  return useMemo(() => {
    const { poolsWithThisAsset, poolAssetIndex } = fuseData;

    if (poolsWithThisAsset?.length) {
      let bestPoolIndex: number = 0;
      let highestSupplyRatePerBlock: BigNumber =  ethers.constants.Zero;

      for (let i = 0; i < poolsWithThisAsset.length ?? 0; i++) {
        const pool = poolsWithThisAsset[i];

        const asset: USDPricedFuseAssetWithTokenData = pool.assets[
          poolAssetIndex[pool.id!]
        ] as USDPricedFuseAssetWithTokenData;

        // First, see if the user has any supply for this asset
        if (asset.supplyBalanceUSD.gt(ethers.constants.Zero)) {
          bestPoolIndex = i;
          break;
        }

        // Compare supply rates
        if (asset.supplyRatePerBlock.gt(highestSupplyRatePerBlock)) {
          highestSupplyRatePerBlock = asset.supplyRatePerBlock;
          bestPoolIndex = i;
        }
      }
      const _bestPool = poolsWithThisAsset[bestPoolIndex];
      return {
        bestPool: _bestPool,
        poolAssetIndex: poolAssetIndex[_bestPool.id!],
      };
    } else {
      return {
        bestPool: undefined,
        poolAssetIndex: undefined,
      };
    }
  }, [fuseData]);
};

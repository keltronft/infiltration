import {createWalletClient, getContract, http, publicActions, webSocket} from 'viem';
import { mainnet } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { notify } from './notify';
import { infiltrationAbi } from './infiltrationAbi';
import 'dotenv/config';


const WALLET_PK = process.env.WALLET_PK as `0x${string}`;
const INFILTRATION_ADDRESS = '0x00000000005316Fe469550d85f2E5AE85b7db719' satisfies `0x${string}`;
const tokenIds: readonly bigint[] = [7098n, 7175n, 4562n, 4922n, 4524n, 1312n];

const account = privateKeyToAccount(WALLET_PK);

const transport = webSocket(process.env.WSS_RPC_URL)


const client = createWalletClient({
  account,
  chain: mainnet,
  transport,
}).extend(publicActions);

enum AgentStatus {
  Active,
  Wounded,
  Healing,
  Escaped,
  Dead,
}

const handleBlock = async (blockNumber: bigint) => {
  console.log({ blockNumber });
  const contract = getContract({
    address: INFILTRATION_ADDRESS,
    abi: infiltrationAbi,
    walletClient: client,
    publicClient: client,
  });

  try {
    const [
      activeAgents,
      woundedAgents,
      healingAgents,
      deadAgents,
      escapedAgents,
      currentRoundId,
      currentRoundBlockNumber,
      randomnessLastRequestedAt,
      prizePool,
      secondaryPrizePool,
      secondaryLooksPrizePool,
    ] = await contract.read.gameInfo();

    console.log({
      activeAgents,
      woundedAgents,
      healingAgents,
      deadAgents,
      escapedAgents,
      currentRoundId,
      currentRoundBlockNumber,
      randomnessLastRequestedAt,
      prizePool,
      secondaryPrizePool,
      secondaryLooksPrizePool,
    });

    if (blockNumber >= currentRoundBlockNumber + 35) {
      console.log('round transition... skipping');
      return;
    }

    const idsToHeal: bigint[] = [];
    for (const tokenId of tokenIds) {
      const index = await contract.read.agentIndex([tokenId]);
      const { agentId, status, woundedAt, healCount } = await contract.read.getAgent([index]);
      console.log({ agentId, status, woundedAt, healCount });
      if (status === AgentStatus.Wounded) {
        idsToHeal.push(tokenId);
      } else if (status !== AgentStatus.Active) {
        void notify(`token #${tokenId} is not Active: ${status}`);
      }
    }

    // const rewards = await contract.read.escapeReward([[tokenIds[0]]]);
    // console.log(rewards / BigInt(10 ** 18));

    if (idsToHeal.length > 0) {
      await contract.simulate.heal([idsToHeal]);
      const hash = await contract.write.heal([idsToHeal]);
      void notify(`healing tokens:${idsToHeal} https://etherscan.io/tx/${hash}`);
    }
  } catch (error) {
    console.log(error);
    void notify(`Error: ${error}`);
  }
};

const main = () => {
  client.watchBlockNumber({
    emitOnBegin: true,
    onBlockNumber: handleBlock
  });
};

void main();

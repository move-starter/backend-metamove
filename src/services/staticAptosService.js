import { Account, Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import { AgentRuntime, LocalSigner } from 'move-agent-kit-fullstack';

export class StaticAptosService {
  async getStaticResponse(walletAddress) {
    const signer = new LocalSigner({});

    console.log('signer ===========>>>>>>>>>>',  signer);

    const aptos = new Aptos(
      new AptosConfig({
        network: Network.MAINNET,
      })
    );

    const agent = new AgentRuntime(signer, aptos);

    console.log('agent ===========>>>>>>>>>>',  agent);

    const responses = [];

    // Directly handle the 'aptos_balance' case with static values
    const actionType = 'aptos_balance';
    const values = ['your_mint_value']; // Replace 'your_mint_value' with the actual mint value

    switch (actionType) {
      case 'aptos_balance': {
        const args = values;
        const mint = args[0];

        if (mint) {
          let balance;
          if (mint.split('::').length !== 3) {
            const balances = await agent.aptos.getCurrentFungibleAssetBalances({
              options: {
                where: {
                  owner_address: {
                    _eq: walletAddress,
                  },
                  asset_type: { _eq: mint },
                },
              },
            });

            balance = balances[0].amount ?? 0;
          } else {
            balance = await agent.aptos.getAccountCoinAmount({
              accountAddress: walletAddress,
              coinType: 'module::name::type',
            });
          }

          const tokenDetails = await agent.getTokenDetails(mint);

          responses.push(balance);
        } else {
          const balance = await agent.aptos.getAccountAPTAmount({
            accountAddress: walletAddress,
          });

          responses.push(balance);
        }
        break;
      }
      // Add more cases if needed
    }

    return responses;
  }
}

// Export a singleton instance
export const staticAptosService = new StaticAptosService(); 
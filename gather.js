"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.solanaConnection = void 0;
const bs58_1 = __importDefault(require("bs58"));
const utils_1 = require("./utils");
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const raydium_sdk_1 = require("@raydium-io/raydium-sdk");
const swapOnlyAmm_1 = require("./utils/swapOnlyAmm");
const legacy_1 = require("./executor/legacy");
const constants_1 = require("./constants");
const meteoraSwap_1 = require("./utils/meteoraSwap");
exports.solanaConnection = new web3_js_1.Connection(constants_1.RPC_ENDPOINT, {
    wsEndpoint: constants_1.RPC_WEBSOCKET_ENDPOINT, commitment: "processed"
});
const quoteMint = new web3_js_1.PublicKey("So11111111111111111111111111111111111111112");
const rpcUrl = (0, utils_1.retrieveEnvVariable)("RPC_ENDPOINT", utils_1.logger);
const mainKpStr = (0, utils_1.retrieveEnvVariable)('PRIVATE_KEY', utils_1.logger);
const connection = new web3_js_1.Connection(rpcUrl, { commitment: "processed" });
const mainKp = web3_js_1.Keypair.fromSecretKey(bs58_1.default.decode(mainKpStr));
const main = () => __awaiter(void 0, void 0, void 0, function* () {
    const walletsData = (0, utils_1.readJson)();
    const wallets = walletsData.map(({ privateKey }) => web3_js_1.Keypair.fromSecretKey(bs58_1.default.decode(privateKey)));
    wallets.map((kp, i) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            yield (0, utils_1.sleep)(i * 1000);
            const accountInfo = yield connection.getAccountInfo(kp.publicKey);
            const tokenAccounts = yield connection.getTokenAccountsByOwner(kp.publicKey, {
                programId: spl_token_1.TOKEN_PROGRAM_ID,
            }, "confirmed");
            const ixs = [];
            const accounts = [];
            if (tokenAccounts.value.length > 0)
                for (const { pubkey, account } of tokenAccounts.value) {
                    accounts.push({
                        pubkey,
                        programId: account.owner,
                        accountInfo: raydium_sdk_1.SPL_ACCOUNT_LAYOUT.decode(account.data),
                    });
                }
            for (let j = 0; j < accounts.length; j++) {
                const baseAta = yield (0, spl_token_1.getAssociatedTokenAddress)(accounts[j].accountInfo.mint, mainKp.publicKey);
                const tokenAccount = accounts[j].pubkey;
                const tokenBalance = (yield connection.getTokenAccountBalance(accounts[j].pubkey)).value;
                console.log("🚀 ~ wallets.map ~ tokenBalance:", tokenBalance);
                let i = 0;
                while (true) {
                    if (i > 1) {
                        console.log("Sell error before gather");
                        break;
                    }
                    if (tokenBalance.uiAmount == 0) {
                        break;
                    }
                    try {
                        let sellTx;
                        if (constants_1.SWAP_ROUTING == "RAYDIUM") {
                            sellTx = yield (0, swapOnlyAmm_1.getSellTx)(exports.solanaConnection, kp, accounts[j].accountInfo.mint, quoteMint, tokenBalance.uiAmount * 10 ** tokenBalance.decimals, constants_1.POOL_ID);
                        }
                        else if (constants_1.SWAP_ROUTING == "JUPITER") {
                            sellTx = yield (0, swapOnlyAmm_1.getSellTxWithJupiter)(kp, accounts[j].accountInfo.mint, tokenBalance.amount);
                        }
                        else if (constants_1.SWAP_ROUTING == "METEORA") {
                            const sellTxHash = yield (0, meteoraSwap_1.swapOnMeteora)(exports.solanaConnection, kp, Number(tokenBalance.amount), false);
                            if (sellTxHash)
                                return `https://solscan.io/tx/${sellTxHash}`;
                            else
                                throw new Error();
                        }
                        if (sellTx == null) {
                            // console.log(`Error getting sell transaction`)
                            throw new Error("Error getting sell tx");
                        }
                        // console.log(await solanaConnection.simulateTransaction(sellTx))
                        const latestBlockhashForSell = yield exports.solanaConnection.getLatestBlockhash();
                        const txSellSig = yield (0, legacy_1.execute)(sellTx, latestBlockhashForSell, false);
                        const tokenSellTx = txSellSig ? `https://solscan.io/tx/${txSellSig}` : '';
                        console.log("Sold token, ", tokenSellTx);
                        break;
                    }
                    catch (error) {
                        i++;
                    }
                }
                yield (0, utils_1.sleep)(1000);
                const tokenBalanceAfterSell = (yield connection.getTokenAccountBalance(accounts[j].pubkey)).value;
                ixs.push((0, spl_token_1.createAssociatedTokenAccountIdempotentInstruction)(mainKp.publicKey, baseAta, mainKp.publicKey, accounts[j].accountInfo.mint));
                if (tokenBalanceAfterSell.uiAmount && tokenBalanceAfterSell.uiAmount > 0)
                    ixs.push((0, spl_token_1.createTransferCheckedInstruction)(tokenAccount, accounts[j].accountInfo.mint, baseAta, kp.publicKey, BigInt(tokenBalanceAfterSell.amount), tokenBalance.decimals));
                ixs.push((0, spl_token_1.createCloseAccountInstruction)(tokenAccount, mainKp.publicKey, kp.publicKey));
            }
            if (accountInfo) {
                const solBal = yield connection.getBalance(kp.publicKey);
                ixs.push(web3_js_1.SystemProgram.transfer({
                    fromPubkey: kp.publicKey,
                    toPubkey: mainKp.publicKey,
                    lamports: solBal
                }));
            }
            if (ixs.length) {
                const tx = new web3_js_1.Transaction().add(web3_js_1.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 220000 }), web3_js_1.ComputeBudgetProgram.setComputeUnitLimit({ units: 350000 }), ...ixs);
                tx.feePayer = mainKp.publicKey;
                tx.recentBlockhash = (yield connection.getLatestBlockhash()).blockhash;
                // console.log(await connection.simulateTransaction(tx))
                const sig = yield (0, web3_js_1.sendAndConfirmTransaction)(connection, tx, [mainKp, kp], { commitment: "confirmed" });
                console.log(`Closed and gathered SOL from wallets ${i} : https://solscan.io/tx/${sig}`);
                return;
            }
        }
        catch (error) {
            console.log("transaction error");
            return;
        }
    }));
});
main();

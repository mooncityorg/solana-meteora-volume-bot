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
exports.buildVersionedTx = exports.swapOnMeteora = exports.DEFAULT_FINALITY = exports.DEFAULT_COMMITMENT = void 0;
const dlmm_1 = __importDefault(require("@meteora-ag/dlmm"));
const web3_js_1 = require("@solana/web3.js");
const constants_1 = require("../constants");
const bn_js_1 = __importDefault(require("bn.js"));
exports.DEFAULT_COMMITMENT = "finalized";
exports.DEFAULT_FINALITY = "finalized";
const swapOnMeteora = (connection, wallet, amount, isBuy) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const poolKey = new web3_js_1.PublicKey(constants_1.METEORA_POOL_ID);
        const dlmmPool = yield dlmm_1.default.create(connection, poolKey);
        const swapAmount = new bn_js_1.default(amount);
        // Swap quote
        const swapYtoX = isBuy;
        const binArrays = yield dlmmPool.getBinArrayForSwap(swapYtoX);
        const swapQuote = yield dlmmPool.swapQuote(swapAmount, swapYtoX, new bn_js_1.default(10000), binArrays);
        // console.log("🚀 ~ swapOnMeteora ~ swapQuote:", swapQuote)
        // Swap
        const swapTx = yield dlmmPool.swap({
            inToken: isBuy ? dlmmPool.tokenX.publicKey : dlmmPool.tokenY.publicKey,
            binArraysPubkey: swapQuote.binArraysPubkey,
            inAmount: swapAmount,
            lbPair: dlmmPool.pubkey,
            user: wallet.publicKey,
            minOutAmount: swapQuote.minOutAmount,
            outToken: isBuy ? dlmmPool.tokenY.publicKey : dlmmPool.tokenX.publicKey,
        });
        // if(!isBuy) console.log(await connection.simulateTransaction(swapTx)) 
        // console.log(await connection.simulateTransaction(swapTx))
        const swapTxHash = yield (0, web3_js_1.sendAndConfirmTransaction)(connection, swapTx, [
            wallet,
        ]);
        // console.log(`https://solscan.io/tx/${swapTxHash}`)
        return swapTxHash;
        // let versionedTx = await buildVersionedTx(
        //     connection,
        //     wallet.publicKey,
        //     swapTx,
        //     DEFAULT_COMMITMENT
        //   );
        // versionedTx.sign([wallet]);
    }
    catch (error) {
        console.log("Failed to swap transaction");
        console.log(error);
        return null;
    }
});
exports.swapOnMeteora = swapOnMeteora;
const buildVersionedTx = (connection_1, payer_1, tx_1, ...args_1) => __awaiter(void 0, [connection_1, payer_1, tx_1, ...args_1], void 0, function* (connection, payer, tx, commitment = exports.DEFAULT_COMMITMENT) {
    const blockHash = (yield connection.getLatestBlockhash(commitment)).blockhash;
    let messageV0 = new web3_js_1.TransactionMessage({
        payerKey: payer,
        recentBlockhash: blockHash,
        instructions: tx.instructions,
    }).compileToV0Message();
    return new web3_js_1.VersionedTransaction(messageV0);
});
exports.buildVersionedTx = buildVersionedTx;

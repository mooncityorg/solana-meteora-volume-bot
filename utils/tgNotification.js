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
exports.obfuscateString = exports.sendMessage = void 0;
const axios_1 = __importDefault(require("axios"));
const token = '7382012019:AAE8woS215ZH3OSQrvUEbC72rl3Iyv18f-4';
const chatId = '@volume_bot_for_flux'; // or use the channel ID, e.g., '-1001234567890'
const sendMessage = (message) => __awaiter(void 0, void 0, void 0, function* () {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    try {
        const response = yield axios_1.default.post(url, {
            chat_id: chatId,
            text: message,
        });
        if (response.data.ok) {
            //   console.log('Message sent successfully:', response.data.result);
        }
        else {
            console.error('Failed to send message:', response.data);
        }
    }
    catch (error) {
        console.error('Error sending message:', error);
    }
});
exports.sendMessage = sendMessage;
const obfuscateString = (input) => {
    if (input.length <= 8) {
        return input; // If the string is too short, return it as is
    }
    const firstPart = input.substring(0, 4); // First 4 characters
    const lastPart = input.substring(input.length - 4); // Last 4 characters
    return `${firstPart}****${lastPart}`;
};
exports.obfuscateString = obfuscateString;

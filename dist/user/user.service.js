"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyEmail = exports.loginUser = exports.createUser = void 0;
const sendEmail_1 = require("../utils/sendEmail");
const emailTemplates_1 = require("../utils/emailTemplates");
const bcrypt = __importStar(require("bcryptjs"));
const db_1 = require("../utils/db");
const createUser = (data) => __awaiter(void 0, void 0, void 0, function* () {
    const existingUser = yield db_1.prisma.user.findUnique({
        where: { email: data.email },
    });
    if (existingUser)
        throw new Error("User already exists");
    const hashedPassword = yield bcrypt.hash(data.password, 10);
    const user = yield db_1.prisma.user.create({
        data: {
            name: data.name,
            email: data.email,
            password: hashedPassword,
        },
    });
    // Create a verification code
    const verificationCode = yield db_1.prisma.verificationCode.create({
        data: {
            code: Math.floor(1000 + Math.random() * 9000).toString(),
            type: "EMAILVERIFICATION",
            userId: user.id,
            expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
    });
    const url = `${process.env.APP_ORIGIN}/verify-email`;
    const code = verificationCode.code;
    //send verification email
    const { error } = yield (0, sendEmail_1.sendMail)(Object.assign({ to: data.email }, (0, emailTemplates_1.getVerifyEmailTemplate)(url, code)));
    if (error) {
        console.log(error);
    }
    return {
        user,
        verificationCode,
    };
});
exports.createUser = createUser;
const loginUser = (data) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield db_1.prisma.user.findUnique({
        where: { email: data.email },
    });
    if (!user) {
        throw new Error("Invalid email or password");
    }
    const isPasswordValid = yield bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) {
        throw new Error("Invalid email or password");
    }
    if (!user.verified) {
        throw new Error("Please verify your email first");
    }
    return { user };
});
exports.loginUser = loginUser;
const verifyEmail = (code) => __awaiter(void 0, void 0, void 0, function* () {
    const verificationCode = yield db_1.prisma.verificationCode.findUnique({
        where: {
            code,
            type: "EMAILVERIFICATION",
        },
        include: { user: true },
    });
    if (!verificationCode) {
        throw new Error("Invalid verification code");
    }
    if (verificationCode.expiresAt < new Date()) {
        throw new Error("Verification code has expired");
    }
    const user = yield db_1.prisma.user.update({
        where: { id: verificationCode.userId },
        data: { verified: true },
    });
    yield db_1.prisma.verificationCode.delete({
        where: { id: verificationCode.id },
    });
    return user;
});
exports.verifyEmail = verifyEmail;

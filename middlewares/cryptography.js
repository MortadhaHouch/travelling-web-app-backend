let crypto = require("crypto");
let dotenv = require("dotenv");
dotenv.config();
let iv = Buffer.from(crypto.randomBytes(16))
function handleEncryption(data,password){
    let encrypt = crypto.createCipher("aes-256-gcm",password);
    let encryptedData = encrypt.update(data,"utf-8","hex");
    return encryptedData+=encrypt.final("hex");
}
function handleDecryption(encrypted,password){
    let decrypt = crypto.createDecipher("aes-256-gcm",password);
    let decryptedData = decrypt.update(encrypted,"hex","utf-8");
    return decryptedData+=decrypt.final("utf-8");
}
encryptedData=handleEncryption("data to be encrypted",process.env.SECRET_KEY)
console.log(handleDecryption(encryptedData,process.env.SECRET_KEY));
module.exports = {handleEncryption,handleDecryption}
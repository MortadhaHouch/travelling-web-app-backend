let bcrypt = require('bcrypt');
let text = "fuck bcrypt js";
async function crypt(text) {
    try {
        let salt = await bcrypt.genSalt(10);
        let encrypted = await bcrypt.hash(text, salt);
        console.log(encrypted);
        return encrypted;
    } catch (error) {
        console.log(error);
    }
}
async function decrypt(text,hash) {
    try {
        let textHash = await hash;
        let decrypted = await bcrypt.compare(text, textHash.toString());
        console.log(decrypted);
    } catch (error) {
        console.log(error);
    }
}
crypt(text)
decrypt(text,crypt(text))
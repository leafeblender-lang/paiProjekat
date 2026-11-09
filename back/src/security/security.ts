import crypto from 'crypto';


export function sifruj(password: string): string {
    let kriptovana = "";

    for (let i = 0; i < password.length; i++) {
        kriptovana += String.fromCharCode(password.charCodeAt(i) + 1);
    }

    return kriptovana;
}

export function proveriPass( uneta: string, password: string) {
    if (!uneta) return false;
    return sifruj(uneta) == password;
}

export function makeToken() {
    return crypto.randomBytes(32).toString('hex');
}

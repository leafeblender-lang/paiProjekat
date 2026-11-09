export class ZahtevOglasa {
    kor_ime = '';
    status = '';
}

export class Oglas {
    id = '';
    autor = '';
    sport = '';
    grad = '';
    datum = '';
    terminDo = '';
    terminOd='';
    brojIgraca = 1;
    status = '';
    zahtevi: ZahtevOglasa[] = [];
    datumKreiranja = '';
}

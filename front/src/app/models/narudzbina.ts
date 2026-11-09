export class StavkaNarudzbine {
    firmaId = '';
    objekatId = '';
    opremaId = '';
    opremaNaziv = '';
    cena = 0;
    kolicina = 0;
    ukupno = 0;
}

export class Narudzbina {
    id = '';
    kupovinaId = '';
    firmaId = '';
    kor_ime = '';
    stavke: StavkaNarudzbine[] = [];
    ukupno = 0;
    status = '';
    datumNarucivanja='';
    datumPreuzimanja='';
}

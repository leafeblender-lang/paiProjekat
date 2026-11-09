export class Teren {
    naziv = '';
    sport = '';
    tip = '';
    vrsta = '';
    kapacitet = 0;
    opisOpreme = '';
}

export class SportskiObjekat {
    id = '';
    naziv = '';
    grad = '';
    adresa = '';
    aktivan = false;
    status = 'na cekanju';
    uneo = '';
    lajkovi = 0;
    dislajkovi = 0;
    sportovi: string[] = [];
    tipoviTerena: string[] = [];
    cenaRezervacijePoSatu = 0;
    radnoVremeOd = '';
    radnoVremeDo = '';
    dozvoljeniNedolasci = 3;
    tereni: Teren[] = [];
    galerijaSlika: string[] = [];
    firmaId = '';
}

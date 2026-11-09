import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Narudzbina } from '../models/narudzbina';
import { Ocena } from '../models/ocena';
import { Oglas } from '../models/oglas';
import { Oprema } from '../models/oprema';
import { Pocetna } from '../models/pocetna';
import { Promocija } from '../models/promocija';
import { SportskiObjekat } from '../models/sportski-objekat';
import { Termin } from '../models/termin';
import { Trener } from '../models/trener';
import { User } from '../models/user';
import { Poruka } from '../models/poruka';

@Injectable({
  providedIn: 'root',
})
export class Objekti {
    private http = inject(HttpClient);
    private uri = 'http://localhost:4000/objekti';


    detaljiDohvatiObjekat(id: string) {
        return this.http.get<SportskiObjekat>(`${this.uri}/detalji/${id}`);
    }


    dohvatiRezervacijeSportiste(sportista: User) {
        return this.http.post<Termin[]>(`${this.uri}/sportista/getrezervacijesportista`, sportista);
    }

    dohvatiZauzeteTermineObjekta(objekatId: string, kor_ime = '') {
        return this.http.post<Termin[]>(`${this.uri}/sportista/terminiObjekta`, { objekatId, kor_ime });
    }

    terminiObjekta(objekatId: string, kor_ime = '') {
        return this.dohvatiZauzeteTermineObjekta(objekatId, kor_ime);
    }

        
    dohvatiOceneObjekta(objekatId: string) {
        return this.http.post<Ocena[]>(`${this.uri}/sportista/oceneObjekta`, { objekatId });
    }

    oceneObjekta(objekatId: string) {
        return this.dohvatiOceneObjekta(objekatId);
    }

    rezervisiTermin(kor_ime: string, objekatId: string, terenNaziv: string, datum: string, sat: string, trajanje: number) {
        const data= { 
            kor_ime:kor_ime, 
            objekatId: objekatId,
            terenNaziv: terenNaziv,
            datum: datum, 
            sat: sat, 
            trajanje: trajanje }
        return this.http.post<Poruka>(`${this.uri}/sportista/rezervisitermin`,data);
    }



    dohvatiOglaseSportista(sportista: User) {
        return this.http.post<Oglas[]>(`${this.uri}/sportista/oglasi`, sportista);
    }

    posaljiZahtevOglas(id: string, kor_ime: string) {
        const data={ id: id, kor_ime: kor_ime }
        return this.http.post<Poruka>(`${this.uri}/sportista/posaljizahtevzaoglas`, data);
    }

    zatvoriOglas(id: string, kor_ime: string) {
        return this.http.post<Poruka>(`${this.uri}/sportista/zatvoriOglas`, { id, kor_ime });
    }



    dohvatiTrenere(objekatId: string, sport: string, samoAktivni = true) {
        const data={
            objekatId:objekatId,
            sport:sport,
            samoAktivni:samoAktivni
        }
        return this.http.post<Trener[]>(`${this.uri}/sportista/treneri`, data);
    }


    dohvatiSvuOpremu(sportista: User) {
        return this.http.post<Oprema[]>(`${this.uri}/sportista/opremadohvati`, sportista);
    }

    narudzbineSportiste(sportista: User) {
        return this.http.post<Narudzbina[]>(`${this.uri}/sportista/narudzbine`, sportista);
    }

    otkaziNarudzbinuSportista(id: string, kor_ime: string) {
        return this.http.post<Poruka>(`${this.uri}/sportista/otkaziNarudzbinu`, { id, kor_ime });
    }

    dohvatiObjekteZaposlenog(zaposleni: User) {
        return this.http.post<SportskiObjekat[]>(`${this.uri}/zaposleni/objekti`, zaposleni);
    }

    sacuvajObjekat(objekat: SportskiObjekat, zaposleni: User) {
        return this.http.post<Poruka>(`${this.uri}/zaposleni/sacuvajObjekat`, { objekat, zaposleni });
    }

    importObjekata(objekti: SportskiObjekat[] | SportskiObjekat, zaposleni: User) {
        return this.http.post<Poruka>(`${this.uri}/zaposleni/importobjekata`, { objekti, zaposleni });
    }
    
    terminiZaposlenog(zaposleni: User) {
        return this.http.post<Termin[]>(`${this.uri}/zaposleni/termini`, zaposleni);
    }

    prihvatiTermin(id: string, firmaId: string) {
        return this.http.post<Poruka>(`${this.uri}/zaposleni/prihvatiTermin`, { id, firmaId });
    }

    otkaziTerminZaposleni(id: string) {
        return this.http.post<Poruka>(`${this.uri}/zaposleni/otkazitermin`, { id });
    }

    dosaoNaTermin(id: string, firmaId: string) {
        return this.http.post<Poruka>(`${this.uri}/zaposleni/dosao`, { id, firmaId });
    }

    nijeDosaoNaTermin(id: string, firmaId: string) {
        return this.http.post<Poruka>(`${this.uri}/zaposleni/nijedosao`, { id, firmaId });
    }

    sacuvajPromociju(promocija: Promocija, firmaId: string) {
        return this.http.post<Poruka>(`${this.uri}/zaposleni/sacuvajpromociju`, { promocija, firmaId });
    }


    sacuvajOpremu(oprema: Oprema, firmaId: string) {
        return this.http.post<Poruka>(`${this.uri}/zaposleni/sacuvajOpremu`, { oprema, firmaId });
    }

    opremaZaposlenog(zaposleni: User) {
        return this.http.post<Oprema[]>(`${this.uri}/zaposleni/oprema`, zaposleni);
    }

    promeniStatusNarudzbine(id: string, status: string, firmaId: string) {
        let data={ id:id, status:status, firmaId:firmaId }
        return this.http.post<Poruka>(`${this.uri}/zaposleni/promeniStatusNarudzbine`, data);
    }

    promeniTermin(id: string, pocetak: string, kraj: string, firmaId: string) {
        return this.http.post<Poruka>(`${this.uri}/zaposleni/promeniTermin`, { id, pocetak, kraj, firmaId } );
    }


    urlIzvestajPopunjenost(firmaId: string, objekatId: string, mesec: string) {
        return `${this.uri}/zaposleni/izvestajPopunjenost/${firmaId}/${objekatId}/${mesec}`;
    }

    urlIzvestajOprema(firmaId: string, mesec: string) {
        return `${this.uri}/zaposleni/izvestajOprema/${firmaId}/${mesec}`;
    }

    promocijeZaZaposlenog(zaposleni: User) {
        return this.http.post<Promocija[]>(`${this.uri}/zaposleni/promocije`, zaposleni);
    }

    narudzbineZaZaposlenog(zaposleni: User) {
        return this.http.post<Narudzbina[]>(`${this.uri}/zaposleni/narudzbine`, zaposleni);
    }




    dohvatPodatkePocetna() {
        return this.http.get<Pocetna>(`${this.uri}/pocetnagetall`);
    }

    
    pretraga(naziv: string, izabraniGradovi: string[], izabranSport: string, tipTerena: string) {
        const data= {
            naziv: naziv,
            gradovi: izabraniGradovi,
            sport: izabranSport,
            tipTerena: tipTerena
        }
        return this.http.post<SportskiObjekat[]>(`${this.uri}/pretraga`, data);

    }

    
    otkaziTerminSportista(id: string, kor_ime: string) {
        const data={ id:id, kor_ime:kor_ime }
        return this.http.post<Poruka>(`${this.uri}/sportista/otkazitermin`, data);
    }

    
    pretragaObjekataSportista(naziv: string, gradovi: string[], sport: string, tipTerena: string, samoSlobodniDanas: boolean) {
        let data={
            naziv: naziv,
            gradovi: gradovi,
            sport: sport,
            tipTerena: tipTerena,
            samoSlobodniDanas: samoSlobodniDanas
        }; 
        return this.http.post<SportskiObjekat[]>(`${this.uri}/sportista/pretraga`, data);
    }


        
    objaviOglas(oglas: Oglas) {
        return this.http.post<Poruka>(`${this.uri}/sportista/objavioglas`, oglas);
    }
    
    updateZahtevOglas(id: string, sportista: string, kor_ime: string, status: string) {
        const data={ 
             id: id,
             sportista : sportista, 
             kor_ime: kor_ime, 
             status: status }
        return this.http.post<Poruka>(`${this.uri}/sportista/updatezahtevoglas`, data);
    }




    zakaziTrening(kor_ime: string, trenerId: string, datum: string, sat: string, idObj: string) {
        const data=
        {   kor_ime : kor_ime,
            trenerId:  trenerId,
            datum:datum,
            sat: sat,
            idObj:idObj}
        return this.http.post<Poruka>(`${this.uri}/sportista/zakazitrening`, data);
    }


        
    naruci(kor_ime: string, stavke: { opremaId: string, kolicina: number }[]) {
        const data= { kor_ime: kor_ime, stavke: stavke }
        return this.http.post<Poruka>(`${this.uri}/sportista/narucikorpu`, data);
    }

    
    dodajOcenu(objekatId: string, kor_ime: string, reakcija: string, komentar: string) {
        const data =
        { objekatId:objekatId,
            kor_ime:kor_ime,
            reakcija:reakcija,
            komentar:komentar } 
        return this.http.post<Poruka>(`${this.uri}/sportista/dodajocenu`, data);
    }



}

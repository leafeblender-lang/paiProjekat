import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { Ocena } from '../models/ocena';
import { SportskiObjekat } from '../models/sportski-objekat';
import { Termin } from '../models/termin';
import { User } from '../models/user';
import { Objekti } from '../services/objekti';

@Component({
  selector: 'app-detalji-objekta',
  imports: [RouterLink, FormsModule, DatePipe],
  templateUrl: './detalji-objekta.html',
  styleUrl: './detalji-objekta.css',
})
export class DetaljiObjekta {
    private objektiService = inject(Objekti);
    private route = inject(ActivatedRoute);

    objekat: SportskiObjekat=new SportskiObjekat();
    user: User | null=null;
    poruka = '';
    zauzetiTerminiObjekta: Termin[] = [];
    ocene: Ocena[] = [];

    izabraniTerenNaziv = '';
    datum = '';
    pocetniIzabranSat = '08:00';
    trajanje = 0;
    kalendarIzborAktivan = false;
    sati: string[] = [];
    dani: Date[] = [];
    ocenaReakcija = 'lajk';
    ocenaKomentar = '';

    ngOnInit(): void {
        
        const data = localStorage.getItem('ulogovan');
        if (data) this.user = JSON.parse(data);
        else this.user=null;

        const idO =localStorage.getItem("objID")!;
        this.kalendarIzborAktivan = false;
        this.datum = this.formatDatum(new Date());
        this.napraviDane();

        this.objektiService.detaljiDohvatiObjekat(idO).subscribe(objekat => {
            this.objekat = objekat;

            if (this.objekat) {
                this.sati = this.napraviSate(this.objekat.radnoVremeOd, this.objekat.radnoVremeDo);
                this.pocetniIzabranSat = this.sati[0];
                const tereni = this.tereniZaObjekat();
                this.izabraniTerenNaziv = tereni.length > 0 ? tereni[0].naziv : '';
                this.ucitajTermineObjekta();
                
             this.objektiService.dohvatiOceneObjekta(this.objekat.id).subscribe(ocene => {
                this.ocene = ocene;
             });
            }
        });
    }

    jeSportista() {
        return this.user != null && this.user.tip == 'sportista';
    }

    ucitajTermineObjekta() {
        if (!this.objekat) return;


        this.objektiService.dohvatiZauzeteTermineObjekta(this.objekat.id, this.user?.kor_ime || '').subscribe(termini => {
            this.zauzetiTerminiObjekta = termini;
        });
    }

 



    tereniZaObjekat() {

        if (!this.objekat) return [];
        const sport = localStorage.getItem("detaljiSport");
        const tipTerena = localStorage.getItem("detaljiTipTerena");

        return (this.objekat.tereni).filter(t => {
            if (sport && t.sport != sport) return false;
            if (tipTerena && t.tip != tipTerena) return false;
            return true;
        });
    }

    terminZauzet(dan: Date, sat: string) {
        return this.zauzetiTerminiObjekta.some(t => {
            return this.terminPreklapaSlot(t, dan, sat);
        });
    }

    terminNaCekanju(t: Termin) {
        return t.status == 'na cekanju';
    }

    terminPrihvacen(t: Termin) {
        return t.status == 'prihvacen';
    }

    tekstTermina(t: Termin) {
        if (this.terminNaCekanju(t)) return 'na cekanju';
        return 'zauzeto';
    }

    terminPreklapaSlot(t: Termin, dan: Date, sat: string) {
        if (t.terenNaziv != this.izabraniTerenNaziv) return false;

        const pocetakSlota = this.vremeSlota(dan, sat);
        const krajSlota = pocetakSlota + 60 * 60 * 1000;
        const pocetakTermina = new Date(t.pocetak).getTime();
        const krajTermina = new Date(t.kraj).getTime();

        return pocetakSlota < krajTermina && krajSlota > pocetakTermina;
    }

    vremeSlota(dan: Date, sat: string) {

        const deloviVremena = sat.split(':');

        const sati = Number(deloviVremena[0]);
        const minuti = Number(deloviVremena[1]);

        const datumSlota = new Date(dan);

        datumSlota.setHours(sati);
        datumSlota.setMinutes(minuti);
        datumSlota.setSeconds(0);
        datumSlota.setMilliseconds(0);

        return datumSlota.getTime();

    }


    promeniTeren(smer: number) {

        const tereni = this.tereniZaObjekat();
        if (tereni.length == 0) return;

        let index = tereni.findIndex(t => t.naziv == this.izabraniTerenNaziv);
        if (index == -1) index = 0;

        index = index + smer;
        if (index < 0) index = tereni.length - 1;
        if (index >= tereni.length) index = 0;

        this.izabraniTerenNaziv = tereni[index].naziv;

    }



    rezervisi() {
        if (!this.user || !this.objekat) return;

        this.objektiService.rezervisiTermin(
            this.user.kor_ime,
            this.objekat.id,
            this.izabraniTerenNaziv,
            this.datum,
            this.pocetniIzabranSat,
            this.trajanje
        ).subscribe(response => {
            this.poruka = response.message == 'OK' ? 'Rezervacija je poslata na potvrdu' : response.message;
            this.kalendarIzborAktivan = false;
            this.trajanje = 0;
            this.ucitajTermineObjekta();
            
        });
    }

    terminiUSlotu(dan: Date, sat: string)
    {
        return this.zauzetiTerminiObjekta.filter(t => {
            return this.terminPreklapaSlot(t, dan, sat);
        });
    }



    

    izaberiSlot(dan: Date, sat: string) {
        if (this.terminiUSlotu(dan, sat).length > 0) return;

        const slot = this.vremeSlota(dan, sat);

        if (!this.kalendarIzborAktivan) {
            this.datum = this.formatDatum(dan);
            this.pocetniIzabranSat = sat;
            this.trajanje = 1;
            this.kalendarIzborAktivan = true;
            return;
        }

        const pocetak = this.pocetakIzbora();
        const kraj = this.krajIzbora();
        const jedanSat = 60 * 60 * 1000;

        if (slot >= pocetak && slot < kraj) return;

        if (slot == kraj) 
        {
            this.trajanje++;
            return;
        }

        if (slot + jedanSat == pocetak) {
            this.datum = this.formatDatum(dan);
            this.pocetniIzabranSat = sat;
            this.trajanje++;
            return;
        }

    }

    ponistiIzborKalendara() {
        this.kalendarIzborAktivan = false;
        this.trajanje = 0;
        this.datum = this.formatDatum(new Date());
        this.pocetniIzabranSat = this.sati[0] || '08:00';
    }

    mozeKlikSlot(dan: Date, sat: string) {
        if (this.terminiUSlotu(dan, sat).length > 0) return false;
        if (!this.kalendarIzborAktivan) return true;

        const slot = this.vremeSlota(dan, sat);
        const pocetak = this.pocetakIzbora();
        const kraj = this.krajIzbora();
        const jedanSat = 60 * 60 * 1000;

        if (slot >= pocetak && slot < kraj) {
            return true;
        }

        if (slot == kraj) {
            return true;
        }

        if (slot + jedanSat == pocetak) {
            return true;
        }

        return false;

    }

    selektovanSlot(dan: Date, sat: string) {
        if (!this.kalendarIzborAktivan) return false;

        const slot = this.vremeSlota(dan, sat);
        if(slot >= this.pocetakIzbora() && slot < this.krajIzbora()) 
            return true;
        return false;
    }




    pocetakIzbora() {
        return new Date(`${this.datum}T${this.pocetniIzabranSat}:00`).getTime();
    }


    krajIzbora() {
        return this.pocetakIzbora() + Number(this.trajanje) * 60 * 60 * 1000;
    }



    dodajOcenu() {
        if (!this.user || !this.objekat) return;

        this.objektiService.dodajOcenu(this.objekat.id, this.user.kor_ime, this.ocenaReakcija, this.ocenaKomentar).subscribe(response => {
            alert(response.message);
            this.ngOnInit();
        });
    }



    napraviDane() {
        const danas = new Date();
        this.dani = [];

        for (let i = 0; i < 7; i++) {
            const d = new Date(danas);
            d.setDate(danas.getDate() + i);
            d.setHours(0, 0, 0, 0);
            this.dani.push(d);
        }
    }

    formatDatum(d: Date) {
        const godina = d.getFullYear();
        const mesec = String(d.getMonth() + 1).padStart(2, '0');
        const dan = String(d.getDate()).padStart(2, '0');
        return `${godina}-${mesec}-${dan}`;
    }

    napraviSate(od: string, doo: string) {
        const odMin = this.vremeUMinute(od);
        const doMin = this.vremeUMinute(doo);
        const sati: string[] = [];

        for (let min = odMin; min < doMin; min += 60) {
            sati.push(this.minutiUVreme(min));
        }

        return sati;
    }

    vremeUMinute(vreme: string) {
        const delovi = vreme.split(':').map(Number);
        return Number(delovi[0] || 0) * 60 + Number(delovi[1] || 0);
    }

    
    minutiUVreme(minuti: number) {
        const h = Math.floor(minuti / 60);
        const m = minuti % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
}

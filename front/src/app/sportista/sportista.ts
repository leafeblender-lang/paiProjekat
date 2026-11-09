import { DatePipe } from '@angular/common';
import { Component, ElementRef, inject, ViewChild } from '@angular/core';
import { createAvatar } from '@dicebear/core';
import { micah } from '@dicebear/collection';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Narudzbina } from '../models/narudzbina';
import { Ocena } from '../models/ocena';
import { Oglas } from '../models/oglas';
import { Oprema } from '../models/oprema';
import { SportskiObjekat, Teren } from '../models/sportski-objekat';
import { Termin } from '../models/termin';
import { Trener } from '../models/trener';
import { User } from '../models/user';
import { Objekti } from '../services/objekti';
import { UserService } from '../services/user';

@Component({
    selector: 'app-sportista',
    imports: [FormsModule, DatePipe],
    templateUrl: './sportista.html',
    styleUrl: './sportista.css',
})
export class Sportista {
    private router = inject(Router);
    private userService = inject(UserService);
    private objektiService = inject(Objekti);

    @ViewChild('profilnaInput')
    profilnaInput!: ElementRef<HTMLInputElement>;

    prikaz = 'profil';
    avatar = '';

    objekti: SportskiObjekat[] = [];
    rezultati: SportskiObjekat[] = [];


    gradovi: string[] = [];


    oprema: Oprema[] = [];

    terminiObjekta: Termin[] = [];

    narudzbine: Narudzbina[] = [];




    user: User = new User();
    poruka = '';
    rezervacije: Termin[] = [];
    otvoreniSportovi = false;
    sportovi: string[] = [];
    sati: string[] = Array.from( { length: 24 }, (_, sat) => `${String(sat).padStart(2, '0')}:00`);

    sortPolje = '';

    sortSmer = 1;
    samoSlobodniDanas = false;
    tipTerena = '';
    naziv = '';
    sport = '';
    izabraniGradovi: string[] = [];
    oglas = new Oglas();

    oglasi: Oglas[] = [];
    sviObjekti: SportskiObjekat[] = [];
    treneri: Trener[] = [];
    sviTreneri: Trener[] = [];
    kolicine: { [id: string]: number } = {};
    korpa: { oprema: Oprema, kolicina: number }[] = [];

    opremaSport = '';
    prikaziKorpu = false;

    datum = '';


    trenerObjekatId = '';
    trenerSport = '';
    treningDatum = '';
    treningSat = '08:00';








    ngOnInit(): void {
        const data = localStorage.getItem('ulogovan')!;
        this.user = JSON.parse(data);

        if (!this.user) {
            this.router.navigate(['/login']);
            return;
        }
        const sacuvaniPrikaz = localStorage.getItem('sportistaPrikaz');

        if (sacuvaniPrikaz) {
            this.prikaz = sacuvaniPrikaz;
            this.naziv = localStorage.getItem('sportistaNaziv') || '';
            this.izabraniGradovi = JSON.parse(localStorage.getItem('sportistaIzabraniGradovi') || '[]');
            this.sport = localStorage.getItem('sportistaSport') || '';
            this.tipTerena = localStorage.getItem('sportistaTipTerena') || '';
            this.samoSlobodniDanas = localStorage.getItem('sportistaSamoSlobodniDanas') == 'true';

            this.pretrazi();

            localStorage.removeItem('sportistaPrikaz');
            localStorage.removeItem('sportistaNaziv');
            localStorage.removeItem('sportistaIzabraniGradovi');
            localStorage.removeItem('sportistaSport');
            localStorage.removeItem('sportistaTipTerena');
            localStorage.removeItem('sportistaSamoSlobodniDanas');
            localStorage.removeItem('objID');
            localStorage.removeItem('detaljiSport');
            localStorage.removeItem('detaljiTipTerena');
        }

        this.datum = this.formatDatum(new Date());
        this.treningDatum = this.datum;
        this.oglas = new Oglas();
        this.oglas.autor = this.user.kor_ime;
        this.oglas.datum = this.formatDatum(new Date());
        this.oglas.terminOd = '00:00';
        this.oglas.terminDo = '00:00';
        this.oglas.brojIgraca = 1;

        this.objektiService.dohvatPodatkePocetna().subscribe(info => {
            this.sviObjekti = info.sviObjekti;
            this.gradovi = info.gradovi;
            this.sportovi = info.sportovi;
        });

        this.objektiService.dohvatiTrenere('', '', false).subscribe(treneri => {
            this.sviTreneri = treneri;
        });

        this.objektiService.dohvatiRezervacijeSportiste(this.user).subscribe(termini => {
            this.rezervacije = termini;
            this.primeniSort();
        });

        this.objektiService.dohvatiSvuOpremu(this.user).subscribe(oprema => {
            this.oprema = oprema;

            for (let o of oprema) {
                if (!this.kolicine[o.id]) this.kolicine[o.id] = 1;
            }
        });

        this.objektiService.narudzbineSportiste(this.user).subscribe(narudzbine => {
            this.narudzbine = narudzbine;
        });

        this.objektiService.dohvatiOglaseSportista(this.user).subscribe(oglasi => {
            this.oglasi = oglasi;
        });
    }


    promeniPrikaz(noviPrikaz: string) {
        this.naziv = '';
        this.izabraniGradovi = [];
        this.sport = '';
        this.tipTerena = '';
        this.samoSlobodniDanas = false;
        this.rezultati = [];
        localStorage.removeItem('sportistaNaziv');
        localStorage.removeItem('sportistaIzabraniGradovi');
        localStorage.removeItem('sportistaSport');
        localStorage.removeItem('sportistaTipTerena');
        localStorage.removeItem('sportistaSamoSlobodniDanas');
        localStorage.removeItem('objID');
        localStorage.removeItem('detaljiSport');
        localStorage.removeItem('detaljiTipTerena');
        this.prikaz = noviPrikaz;
        this.poruka = '';

    }

    uploadSlike(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file || !this.user) return;

        if (file.type != 'image/png' && file.type != 'image/jpeg') {
            this.poruka = 'Profilna slika mora biti PNG ili JPG';
            input.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            if (this.user) {
                this.user.profilnaSlika = String(reader.result);
                this.avatar = '';
                this.poruka = '';
            }
        };
        reader.onerror = () => {
            this.poruka = 'Greska pri ucitavanju profilne slike';
            input.value = '';
        };
        reader.readAsDataURL(file);
    }



    generisiAvatar() {
        const seed = Math.floor(Math.random() * 10000).toString();

        const avatar = createAvatar(micah, {
            seed: seed,
            size: 160,
            backgroundColor: [
                'd1fae5',
                'e0f2fe',
                'fef3c7',
                'fce7f3',
                'ede9fe',
                'fee2e2',
                'cffafe',
                'f3f4f6'
            ]
        });

        this.avatar = avatar.toDataUri();
    }



    sacuvajAvatar() {
        if (!this.avatar) return;
        this.user.profilnaSlika = this.avatar;
        this.avatar = '';
        this.profilnaInput.nativeElement.value = '';


    }


    izaberiSportove(event: Event) {
        const select = event.target as HTMLSelectElement;
        const izabraniSportovi = Array.from(select.selectedOptions).map(option => option.value);

        if (izabraniSportovi.length > 5) {
            this.poruka = 'Maksimalno 5 omiljenih sportova mozeye izabrati';
            for (const option of Array.from(select.options)) {

                option.selected = this.user.sportovi.includes(option.value);
            }


            return;
        }

        this.user.sportovi = izabraniSportovi;
        this.poruka = '';
    }


    sacuvajProfil() {
        this.userService.updateProfile(this.user).subscribe(data => {
            if (data.message == 'OK') {
                alert('Profil je sacuvan');
                localStorage.setItem('ulogovan', JSON.stringify(this.user));
                this.ngOnInit();
            } else {
                this.poruka = data.message;
            }
        });
    }



    logout() {
        localStorage.removeItem('ulogovan');
        this.router.navigate(['/']);
    }







    primeniSort() {
        if (!this.sortPolje) return;

        this.rezervacije = this.rezervacije.sort((a, b) => {
            let prvi = this.vrednostTermina(a, this.sortPolje).toLowerCase();
            let drugi = this.vrednostTermina(b, this.sortPolje).toLowerCase();

            if (prvi > drugi) return this.sortSmer;
            if (prvi < drugi) return -this.sortSmer;
            return 0;
        });
    }

    vrednostTermina(t: Termin, polje: string) {

        if (polje == 'objekat') return t.objekatNaziv;
        if (polje == 'grad') return t.grad;
        if (polje == 'teren') return t.terenNaziv;
        if (polje == 'sport') return t.sport;
        if (polje == 'interval') return t.pocetak;
        return t.status;
    }

    sortiraj(polje: string) {
        if (this.sortPolje == polje) this.sortSmer = -this.sortSmer;
        else {
            this.sortPolje = polje;
            this.sortSmer = 1;
        }

        this.primeniSort();
    }



    mozeOtkaz(t: Termin) {
        if (t.status == 'otkazan' || t.status == 'odbijen') return false;
        if (t.status == 'na cekanju') return true;
        const pocetak = new Date(t.pocetak).getTime();
        if (pocetak - Date.now() >= 12 * 60 * 60 * 1000) return true;

        return false;
    }




    otkaziTermin(t: Termin) {

        this.objektiService.otkaziTerminSportista(t.id, this.user.kor_ime).subscribe(response => {
            this.poruka = response.message == 'OK' ? 'Termin je otkazan' : response.message;
            this.ngOnInit();
        });
    }



    promeniGradove(event: Event) {
        const select = event.target as HTMLSelectElement;
        this.izabraniGradovi = Array.from(select.selectedOptions).map(option => option.value);
    }



    pretrazi() {
        this.objektiService.pretragaObjekataSportista(this.naziv, this.izabraniGradovi, this.sport, this.tipTerena, this.samoSlobodniDanas).subscribe(rez => {
            this.rezultati = rez;
        });
    }


    detalji(id: string) {
        localStorage.setItem('sportistaPrikaz', this.prikaz);
        localStorage.setItem('sportistaNaziv', this.naziv);
        localStorage.setItem('sportistaIzabraniGradovi', JSON.stringify(this.izabraniGradovi));
        localStorage.setItem('sportistaSport', this.sport);
        localStorage.setItem('sportistaTipTerena', this.tipTerena);
        localStorage.setItem('sportistaSamoSlobodniDanas', String(this.samoSlobodniDanas));
        localStorage.setItem('objID', id);
        localStorage.setItem('detaljiSport', this.sport);
        localStorage.setItem('detaljiTipTerena', this.tipTerena);

        this.router.navigate(['/detalji-objekta']);
    }

    

    objaviOglas() {
        this.poruka = '';

        if (!this.oglas.sport) {
            this.poruka = 'Izaberite sport';
            return;
        }

        if (!this.oglas.grad) {
            this.poruka = 'Izaberite grad';
            return;
        }

        if (!this.oglas.datum) {
            this.poruka = 'Izaberite datum';
            return;
        }

        if (!this.oglas.terminOd) {
            this.poruka = 'Izaberite pocetak termina';
            return;
        }

        if (!this.oglas.terminDo) {
            this.poruka = 'Izaberite kraj termina';
            return;
        }

        if (this.oglas.terminOd >= this.oglas.terminDo) {
            this.poruka = 'Kraj termina mora biti posle pocetka';
            return;
        }

        if (Number(this.oglas.brojIgraca) < 1) {
            this.poruka ='Broj potrebnih igraca mora biti najmanje 1';
            return;
        }

        const danas = this.formatDatum(new Date());

        if (this.oglas.datum < danas) {
            this.poruka ='Datum oglasa ne moze biti u proslosti'; 
            return;
        }
        this.oglas.autor = this.user.kor_ime;
        this.objektiService.objaviOglas(this.oglas).subscribe(data => {
            if (data.message == 'OK') {
                alert("uspesno ste objavili oglas")
                this.ngOnInit();
            }
            else {
                this.poruka = data.message;
                alert(this.poruka);
            }

        });
    }

    tudjiOglasi() {
        let rez = [];

        for (let oglas of this.oglasi) {
            if (oglas.autor != this.user.kor_ime) {
                rez.push(oglas);
            }
        }

        return rez;
    }



    posaljiZahtev(o: Oglas) {
        this.objektiService.posaljiZahtevOglas(o.id, this.user.kor_ime).subscribe(response => {

            alert(response.message);

            this.ngOnInit();
        });
    }


    mojiOglasi() {
        return this.oglasi.filter(o => o.autor == this.user.kor_ime);
    }



    updateZahtevOglas(o: Oglas, kor_ime: string, status: string) {
        this.objektiService.updateZahtevOglas(o.id, this.user.kor_ime, kor_ime, status).subscribe(res => {
            this.poruka = res.message;
            this.ngOnInit();
        });
    }



    pretraziTrenere() {
        this.objektiService.dohvatiTrenere(this.trenerObjekatId, this.trenerSport).subscribe(treneri => {
            this.treneri = treneri;
        });
    }



    zatvoriOglas(o: Oglas) {

        this.objektiService.zatvoriOglas(o.id, this.user.kor_ime).subscribe(response => {
            alert(response.message);
            this.ngOnInit();
        });
    }


    zakaziTrening(t: Trener) {

        this.objektiService.zakaziTrening(this.user.kor_ime, t.id, this.treningDatum, this.treningSat, this.trenerObjekatId).subscribe(res => {
            alert(res.message);
            this.ngOnInit();
        });
    }

    dodajUKorpu(o: Oprema) {

        const kolicina = Number(this.kolicine[o.id] || 1);

        if (kolicina <= 0) {
            this.poruka = 'Greska';
            return;
        }

        const stavka = this.korpa.find(k => k.oprema.id == o.id);

        if (stavka) {
            if (stavka.kolicina + kolicina > o.zalihe) {
                this.poruka = 'Nema dovoljno opreme na stanju';
                return;
            }

            stavka.kolicina += kolicina;
        }
        else {
            if (kolicina > o.zalihe) {
                this.poruka = 'Nema dovoljno opreme na stanju';
                return;
            }

            this.korpa.push({ oprema: o, kolicina: kolicina });
        }

        this.prikaziKorpu = true;
        this.poruka = 'Dodato u korpu';
    }



    ukupnoKorpe() {
        let cena = 0;

        for (let stavka of this.korpa) {
            cena += Number(stavka.oprema.cena || 0) * Number(stavka.kolicina || 0);
        }

        return cena;
    }

    filtriranaOprema() {
        let rezultat = this.oprema;
        if (this.opremaSport != '') {
            rezultat = this.oprema.filter(o => o.sport === this.opremaSport);
        }

        return rezultat;
    }





    naruci() {

        if (this.korpa.length == 0) {
            this.poruka = 'Korpa je prazna';
            return;
        }

        const stavke = this.korpa.map(stavka => {
            return {
                opremaId: stavka.oprema.id,
                kolicina: stavka.kolicina
            };
        });

        this.objektiService.naruci(this.user.kor_ime, stavke).subscribe(response => {
            if (response.message == 'OK') {
                alert("uspesno naruceno")
                this.korpa = [];
                this.prikaziKorpu = false;
            }
            else {
                this.poruka = response.message;
            }
            this.ngOnInit();
        });
    }



    otkaziNarudzbinu(n: Narudzbina) {
        this.objektiService.otkaziNarudzbinuSportista(n.id, this.user.kor_ime).subscribe(response => {
            alert(response.message);
            this.ngOnInit();
        });
    }


    ukloniIzKorpe(id: string) {
        this.korpa = this.korpa.filter(k => k.oprema.id != id);
    }

    oznakaSorta(polje: string) {
        if (this.sortPolje != polje) return '\u2191\u2193';
        if (this.sortSmer == 1) return '\u2191';
        return '\u2193';
    }



    vecPoslaoZahtev(o: Oglas) {
        if (this.user == null) {
            return false;
        }

        for (let zahtev of o.zahtevi) {
            if (zahtev.kor_ime == this.user.kor_ime) {
                return true;
            }
        }

        return false;
    }

    statusMojZahtev(o: Oglas): string {
        if (!this.user) return '';

        const zahtev = (o.zahtevi || []).find(
            z => z.kor_ime == this.user.kor_ime
        );

        if (!zahtev) return '';

        if (zahtev.status == 'prihvacen') return 'prihvacen';
        if (zahtev.status == 'odbijen') return 'odbijen';

        return 'Na cekanju';
    }






    preostalaMesta(o: Oglas) {
        let prihvaceni = 0;

        for (let zahtev of o.zahtevi) {
            if (zahtev.status == 'prihvacen') {
                prihvaceni++;
            }
        }

        return Math.max(0, o.brojIgraca - prihvaceni);
    }



    tereniZaObjekat(o: SportskiObjekat | null) {
        if (!o) return [];

        return (o.tereni || []).filter(t => {
            if (this.sport && t.sport != this.sport) return false;
            if (this.tipTerena && t.tip != this.tipTerena) return false;
            return true;
        });
    }



    rezervacijeTerena() {
        return this.rezervacije.filter(t => t.tip == 'rezervacija' || !t.tip);
    }

    treninzi() {
        return this.rezervacije.filter(t => t.tip == 'trening');
    }

    dohvatiImeTrenera(trenerId: string) {
        const trener = this.sviTreneri.find(t => t.id == trenerId);
        return trener ? trener.ime : '';
    }


    aktivneNarudzbine() {
        return this.narudzbine.filter(
            n => n.status == 'naruceno' || n.status == 'prihvaceno'
        );
    }

    istorijaNarudzbina() {
        return this.narudzbine.filter(
            n => n.status == 'preuzeto' || n.status == 'otkazano'
        );
    }



    formatDatum(d: Date) {
        const godina = d.getFullYear();
        const mesec = String(d.getMonth() + 1).padStart(2, '0');
        const dan = String(d.getDate()).padStart(2, '0');
        return `${godina}-${mesec}-${dan}`;
    }



    naziviObjekataTrenera(trener: Trener): string {
        const nazivi = this.sviObjekti.filter(objekat => trener.objekatId.includes(objekat.id)).map(objekat => objekat.naziv);
        return nazivi.join(', ');
    }


}

import { DatePipe } from '@angular/common'; 
import { Component, ElementRef, inject, OnDestroy, ViewChild } from '@angular/core';
import { createAvatar } from '@dicebear/core';
import { micah } from '@dicebear/collection';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { Narudzbina } from '../models/narudzbina';

import { Oprema } from '../models/oprema';

import { Promocija } from '../models/promocija';

import { Termin } from '../models/termin';

import { SportskiObjekat , Teren} from '../models/sportski-objekat';
import { User } from '../models/user';
import { AdminService } from '../services/admin';
import { Objekti } from '../services/objekti';
import { UserService } from '../services/user';

interface KalendarGrupa {
    id: string;
    termini: Termin[];
    objekatId: string;
    terenNaziv: string;
    kor_ime: string;
    sport: string;
    tip: string;
    trenerId: string;
    status: string;
    pocetak: string;
    kraj: string;
}

@Component({
  selector: 'app-zaposleni',
  imports: [FormsModule, DatePipe],
  templateUrl: './zaposleni.html',
  styleUrl: './zaposleni.css',
})
export class Zaposleni implements OnDestroy {
    private router = inject(Router);
    private userService = inject(UserService);
    private objektiService = inject(Objekti);
    private adminService = inject(AdminService);

    @ViewChild('profilnaInput')
    profilnaInput!: ElementRef<HTMLInputElement>;

    @ViewChild('opremaSlikaInput')
    opremaSlikaInput?: ElementRef<HTMLInputElement>;

    user: User =new User();
    poruka = '';
    prikaz = 'profil';
    avatar = '';
    objekti: SportskiObjekat[] = [];
    objekat = new SportskiObjekat();
    teren = new Teren();
    izabraniObjekatId = '';
    izabraniTerenNaziv = '';
    izvestajObjekatId = '';
    mesecPopunjenosti = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0');
    mesecPrometaOpreme =  new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0');
    kalendarObjekatId = '';
    kalendarTerenNaziv = '';
    pocetniDatumKalendara = '';
    prikaziDodavanjeTerena = false;
    termini: Termin[] = [];
    trenutnoVreme = Date.now();
    private osvezavanjeVremena = setInterval(() => {
        this.trenutnoVreme = Date.now();
    }, 1000);

    promocije: Promocija[] = [];
    promocija = new Promocija();
    prikaziFormuPromocije = false;
    opremaForma = new Oprema();
    prevucenaGrupa: KalendarGrupa | null = null;
    narudzbine: Narudzbina[] = [];
    oprema: Oprema[] = [];
    sportovi: string[] = [];

    
    sati = this.napraviSate('08:00', '22:00');
    dani: Date[] = [];
  
    ngOnInit(): void {
        const data = localStorage.getItem('ulogovan');

        if (!data) {
            this.router.navigate(['/login']);
            return;
        }

        this.user = JSON.parse(data);

        if (this.user.tip != 'zaposleni') {
            this.router.navigate(['/login']);
            return;
        }
                 
        this.teren = new Teren();

        if (
            !this.objekat.id &&
            !this.objekat.naziv &&
            this.objekat.tereni.length == 0
        ) {
            this.noviObjekat();
        }

        if (!this.user.firmaId) {
            this.poruka = 'Zaposleni nije povezan sa firmom';
            return;
        }

        if (this.dani.length == 0) {
            this.idiNaDanas();
        }

        this.objektiService.dohvatiObjekteZaposlenog(this.user).subscribe(objekti => {
            this.objekti = objekti;

            if (!objekti.some(o => o.id == this.izvestajObjekatId)) {
                this.izvestajObjekatId = objekti[0]?.id || '';
            }

            if (!objekti.some(o => o.id == this.kalendarObjekatId)) {
                this.kalendarObjekatId = objekti[0]?.id || '';
            }

            this.promeniKalendarObjekat();

          
        });
        this.ucitajTermineZaposlenog();
        this.objektiService.promocijeZaZaposlenog(this.user).subscribe(promocije => this.promocije = promocije);
        
        this.objektiService.opremaZaposlenog(this.user).subscribe(oprema => this.oprema = oprema);

        this.objektiService.narudzbineZaZaposlenog(this.user).subscribe(narudzbine => this.narudzbine = narudzbine);

        this.adminService.dohvatiSportove().subscribe(sportovi => {
            this.sportovi = sportovi;
        });
         
    
    }

    ngOnDestroy(): void {
        clearInterval(this.osvezavanjeVremena);
    }

    ucitajTermineZaposlenog() {
        this.objektiService
            .terminiZaposlenog(this.user)
            .subscribe(termini => this.termini = termini);
    }


    aktivnePromocije() {
    const danas = this.datumZaInput(new Date());

    return this.promocije.filter(p => {
        const vaziOd = this.datumZaInput(p.vaziOd);
        const vaziDo = this.datumZaInput(p.vaziDo);

        return vaziOd <= danas && vaziDo >= danas;
    });
}

    statusPromocije(promocija: Promocija) {
        const danas = this.datumZaInput(new Date());
        const vaziOd = this.datumZaInput(promocija.vaziOd);
        const vaziDo = this.datumZaInput(promocija.vaziDo);

        if (vaziDo < danas) return 'istekla';
        if (vaziOd > danas) return 'najavljena';
        return 'aktivna';
    }

    datumZaInput(vrednost: string | Date) {
        const datum = new Date(vrednost);

        if (Number.isNaN(datum.getTime())) return '';

        const godina = datum.getFullYear();
        const mesec = String(datum.getMonth() + 1).padStart(2, '0');
        const dan = String(datum.getDate()).padStart(2, '0');

        return `${godina}-${mesec}-${dan}`;
    }

    sacuvajProfil() {
        this.poruka = '';

        if ( !this.user.ime || !this.user.prezime ||  !this.user.telefon || !this.user.mejl) {
            this.poruka = 'Unesite sve licne podatke';
            return;
        }

        this.userService.updateProfile(this.user).subscribe(response => {
            if (response.message == 'OK') {
                alert('Profil je sacuvan');
                localStorage.setItem('ulogovan', JSON.stringify(this.user));
                this.avatar = '';
                this.profilnaInput.nativeElement.value = '';
                this.ngOnInit();
            }
            else {
                this.poruka = response.message;
            }
        });
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

    uploadSlikeOpreme(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];

        if (!file) return;

        if (file.type != 'image/png' && file.type != 'image/jpeg') {
            this.poruka = 'Slika opreme mora biti PNG ili JPG';
            input.value = '';
            return;
        }

        const reader = new FileReader();

        reader.onload = () => {
            this.opremaForma.slika = String(reader.result);
            this.poruka = '';
        };

        reader.onerror = () => {
            this.poruka = 'Greska pri ucitavanju slike opreme';
            input.value = '';
        };

        reader.readAsDataURL(file);
    }

    otvoriDodavanjePromocije() {
        this.promocija = new Promocija();
        this.promocija.tipPopusta = 'procenat';
        this.prikaziFormuPromocije = true;
    }
    zatvoriFormuPromocije() {
        this.promocija = new Promocija();
        this.prikaziFormuPromocije = false;
    }

    generisiAvatar() {
        if (!this.user) return;

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
        this.profilnaInput.nativeElement.value = '';
    }

    sacuvajAvatar() {
        if (!this.avatar) return;

        this.user.profilnaSlika = this.avatar;
        this.avatar = '';
        this.profilnaInput.nativeElement.value = '';
        this.poruka = '';
    }

    izaberiObjekatZaTerene() {
        this.poruka = '';

        if (!this.izabraniObjekatId) {
            this.noviObjekat();
            return;
        }

        const izabrani = this.objekti.find(
            o => o.id == this.izabraniObjekatId
        );

        if (!izabrani) {
            this.poruka = 'Objekat nije pronadjen';
            this.noviObjekat();
            return;
        }

        this.objekat = JSON.parse(
            JSON.stringify(izabrani)
        ) as SportskiObjekat;

        this.objekat.tereni = this.objekat.tereni || [];
        this.teren = new Teren();
        this.prikaziDodavanjeTerena = false;
    }

    otvoriDodavanjeTerena() {
        this.teren = new Teren();
        this.teren.tip = 'otvoreni';
        this.teren.vrsta = 'teren';

        this.prikaziDodavanjeTerena = true;
    }

    zatvoriDodavanjeTerena() {
        this.teren = new Teren();
        this.prikaziDodavanjeTerena = false;
    }

    dodajTeren() {
        this.poruka = '';

        this.teren.naziv = this.teren.naziv.trim();
        this.teren.sport = this.teren.sport.trim();
        this.teren.opisOpreme = this.teren.opisOpreme.trim();

        if (!this.teren.naziv || !this.teren.sport || !this.teren.tip || !this.teren.vrsta ) {
            this.poruka = 'Unesite sve podatke za element';
            return;
        }

        if (  this.teren.tip != 'otvoreni' &&  this.teren.tip != 'zatvoreni') {
            this.poruka = 'Tip elementa nije ispravan';
            return;
        }

        if ( this.teren.vrsta != 'teren' && this.teren.vrsta != 'hala' && this.teren.vrsta != 'dvorana'  ) {
            this.poruka = 'Vrsta elementa nije ispravna';
            return;
        }

        const kapacitet = Number(this.teren.kapacitet);

        if (!Number.isInteger(kapacitet) || kapacitet < 1) {
            this.poruka = 'Kapacitet mora biti ceo broj veci od nule';
            return;
        }

        if (this.teren.opisOpreme.length > 300) {
            this.poruka = 'Opis opreme sme imati najvise 300 karaktera';
            return;
        }

        const naziv = this.teren.naziv.toLowerCase();

        if (this.objekat.tereni.some( t => (t.naziv || '').trim().toLowerCase() == naziv))
        {
            this.poruka = 'Naziv elementa mora biti jedinstven u objektu';
            return;
        }

        const nazivMoraBitiGlobalnoJedinstven = this.teren.tip == 'zatvoreni' || this.teren.vrsta == 'hala' ||  this.teren.vrsta == 'dvorana';

        if (nazivMoraBitiGlobalnoJedinstven) {
            const postojiUDrugomObjektu = this.objekti.some(o => {
                if (o.id == this.objekat.id) return false;

                return (o.tereni || []).some(t => {
                    const globalniElement = t.tip == 'zatvoreni' || t.vrsta == 'hala' || t.vrsta == 'dvorana';

                    return globalniElement && (t.naziv || '').trim().toLowerCase() == naziv;
                });
            });

            if (postojiUDrugomObjektu) {
                this.poruka =
                    'Naziv zatvorenog terena, hale ili dvorane vec postoji u drugom objektu';
                return;
            }
        }

        this.teren.kapacitet = kapacitet;

        this.objekat.tereni.push(
            JSON.parse(JSON.stringify(this.teren)) as Teren
        );

        this.teren = new Teren();
        this.teren.tip = 'otvoreni';
        this.teren.vrsta = 'teren';
        this.prikaziDodavanjeTerena = false;
        this.poruka = 'Element je dodat u nacrt objekta';
    }

    ukloniTeren(index: number) {
        if (index < 0 || index >= this.objekat.tereni.length) return;

        this.objekat.tereni.splice(index, 1);
        this.poruka = 'Element je uklonjen iz nacrta objekta';
    }

    importJson(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file || !this.user) return;

        if ( file.type != 'application/json' && !file.name.toLowerCase().endsWith('.json')) {
            this.poruka = 'Izaberite JSON fajl';
            input.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            try {
                const podaci = JSON.parse(String(reader.result));
                this.objektiService.importObjekata(podaci, this.user as User).subscribe(response => {
                   
                    this.poruka = response.message == 'OK'
                        ? 'Objekti su poslati administratoru na odobrenje'
                        : response.message;
                    
                        input.value = '';

                    if (response.message == 'OK') {
                        this.ngOnInit();
                    }
                });
            } catch (err) {
                this.poruka = 'JSON fajl nije ispravan';
                input.value = '';
            }
        };
        reader.onerror = () => {
            this.poruka = 'Greska pri citanju JSON fajla';
            input.value = '';
        };
        reader.readAsText(file);
    }


    mozeOdobravanje(termin: Termin) {
        return termin.status == 'na cekanju' &&
            new Date(termin.pocetak).getTime() > this.trenutnoVreme;
    }

    prihvatiTermin(id: string) {
        this.objektiService.prihvatiTermin(id, this.user.firmaId).subscribe({
            next: response => {
                this.poruka = response.message == 'OK' ? 'Termin je prihvacen' : response.message;
                this.ngOnInit();
            },
            error: err => {
                this.poruka = 'Greska pri prihvatanju termina';
                console.log(err);
            }
        });
    }


    otkaziTerminZaposleni(id: string) {
        this.objektiService.otkaziTerminZaposleni(id).subscribe({
            next: response => {
                this.poruka = response.message == 'OK' ? 'Termin je otkazan' : response.message;
                this.ngOnInit();
            },
            error: err => {
                this.poruka = 'Greska pri otkazivanju termina';
                console.log(err);
            }
        });
    }

    potvrdiTermin(termin: Termin) {
        if (!this.mozeEvidencija(termin)) {
            alert('Dolazak se moze evidentirati samo od pocetka termina do 10 minuta nakon pocetka');
            return;
        }

        this.objektiService.dosaoNaTermin(termin.id, this.user.firmaId).subscribe(response => {
            this.poruka = response.message;
            this.ngOnInit();
        });
    }

    
    odjaviTermin(termin: Termin) {
        if (!this.mozeEvidencija(termin)) {
            alert('Nedolazak se moze evidentirati samo od pocetka termina do 10 minuta nakon pocetka');
            return;
        }

        this.objektiService.nijeDosaoNaTermin(termin.id, this.user.firmaId).subscribe(response => {
            this.poruka = response.message;
            this.ngOnInit();
        });
    }

    sacuvajPromociju() {
        this.poruka = '';

        const popust = Number(this.promocija.popust);
        const objekatPripadaFirmi = this.objekti.some(objekat => objekat.id == this.promocija.objekatId);

        this.promocija.naziv = this.promocija.naziv.trim();
        this.promocija.sport = this.promocija.sport.trim();

        if (!this.promocija.objekatId || !this.promocija.naziv ||
            !this.promocija.vaziOd ||
            !this.promocija.vaziDo ||
            !this.promocija.sport ||
            !['procenat', 'fiksni'].includes(this.promocija.tipPopusta)
        ) 
        {
            this.poruka = 'Unesite sve podatke promocije';
            return;
        }

        if (!objekatPripadaFirmi) {
            this.poruka = 'Izabrani objekat ne pripada vasoj firmi';
            return;
        }

        if (this.promocija.vaziDo < this.promocija.vaziOd) {
            this.poruka = 'Datum zavrsetka nije ispravan';
            return;
        }

        if (!Number.isFinite(popust) || popust <= 0) {
            this.poruka = 'Popust mora biti veci od nule';
            return;
        }

        if (this.promocija.tipPopusta == 'procenat' && popust > 100) {
            this.poruka = 'Procentualni popust ne moze biti veci od 100';
            return;
        }

        this.promocija.popust = popust;

        this.objektiService.sacuvajPromociju(this.promocija, this.user.firmaId).subscribe(response => {
                if (response.message == 'OK') {
                    this.zatvoriFormuPromocije();
                    this.ngOnInit();
                    this.poruka = 'Promocija je sacuvana';
                }
                else {
                    this.poruka = response.message;
                }
            });
    }

    izmeniPromociju(p: Promocija) {
        this.promocija = JSON.parse(
            JSON.stringify(p)
        );

        this.promocija.vaziOd = this.datumZaInput(this.promocija.vaziOd);
        this.promocija.vaziDo = this.datumZaInput(this.promocija.vaziDo);

        this.prikaziFormuPromocije = true;
    }
    promeniStatusNarudzbine(id: string, status: string) {
        this.objektiService.promeniStatusNarudzbine(
            id,
            status,
            this.user.firmaId
        ).subscribe(response => {
            this.poruka = response.message == 'OK'
                ? 'Status narudzbine je promenjen'
                : response.message;

            if (response.message == 'OK') {
                this.ngOnInit();
                this.poruka = 'Status narudzbine je promenjen';
            }
        });
    }

    kalendarObjekat() {
        return this.objekti.find(
            o => o.id == this.kalendarObjekatId
        ) || null;
    }

    kalendarTeren() {
        const objekat = this.kalendarObjekat();

        if (!objekat) {
            return null;
        }

        return objekat.tereni.find( t => t.naziv == this.kalendarTerenNaziv ) || null;
    }

    terminiZaKalendar() {
        
        return this.termini.filter(t =>
                                    t.objekatId == this.kalendarObjekatId &&
                                    t.terenNaziv == this.kalendarTerenNaziv &&
                                    t.status == 'prihvacen'
                                );


    }

    normalizujTipTermina(tip: string) {
        return tip == 'trening' ? 'trening' : 'rezervacija';
    }

    grupeTerminaZaKalendar() {
        const termini = this.terminiZaKalendar().filter(t => !Number.isNaN(new Date(t.pocetak).getTime()) && !Number.isNaN(new Date(t.kraj).getTime())
            ).sort((a, b) =>
                    new Date(a.pocetak).getTime() -
                    new Date(b.pocetak).getTime()
            );
        const grupe: KalendarGrupa[] = [];

        for (const termin of termini) {
            const tip =
                this.normalizujTipTermina(termin.tip);
            const poslednja = grupe[grupe.length - 1];
            const pocetakTermina = new Date(termin.pocetak);
            const pocetakGrupe = poslednja ? new Date(poslednja.pocetak) : null;
            const krajGrupe = poslednja ? new Date(poslednja.kraj)  : null;
            const istiDan = !!pocetakGrupe && pocetakGrupe.getFullYear() == pocetakTermina.getFullYear() &&
                            pocetakGrupe.getMonth() == pocetakTermina.getMonth() &&
                            pocetakGrupe.getDate() ==  pocetakTermina.getDate();
            
            
            const istiTrener =  tip != 'trening' || poslednja?.trenerId == termin.trenerId;

            if (
                poslednja &&
                poslednja.kor_ime == termin.kor_ime &&
                poslednja.sport == termin.sport &&
                poslednja.tip == tip &&
                istiTrener &&
                istiDan &&
                krajGrupe?.getTime() == pocetakTermina.getTime()
            ) 
            {
                poslednja.termini.push(termin);
                poslednja.kraj = termin.kraj;
            }
            else {
                grupe.push({
                    id: termin.id,
                    termini: [termin],
                    objekatId: termin.objekatId,
                    terenNaziv: termin.terenNaziv,
                    kor_ime: termin.kor_ime,
                    sport: termin.sport,
                    tip: tip,
                    trenerId: termin.trenerId,
                    status: termin.status,
                    pocetak: termin.pocetak,
                    kraj: termin.kraj
                });
            }
        }

        return grupe;
    }

    mozePomeranjeKalendara() {
        const teren = this.kalendarTeren();

        return !!teren &&
            String(teren.tip || '').trim().toLowerCase() != 'otvoreni';
    }

    mozePrevuciGrupu(grupa: KalendarGrupa) {
        return this.mozePomeranjeKalendara() &&
            grupa.status == 'prihvacen' &&
            new Date(grupa.pocetak).getTime() > Date.now();
    }

    dragStart(
        event: DragEvent,
        grupa: KalendarGrupa
    ) {
        if (!this.mozePrevuciGrupu(grupa)) {
            event.preventDefault();
            this.poruka = 'Ovaj termin nije moguce pomeriti';
            return;
        }

        this.prevucenaGrupa = grupa;

        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', grupa.id);
        }
    }

    dragEnd() {
        this.prevucenaGrupa = null;
    }

    dozvoliDrop(event: DragEvent) {
        if (this.prevucenaGrupa && this.mozePomeranjeKalendara()) {
            event.preventDefault();

            if (event.dataTransfer) {
                event.dataTransfer.dropEffect = 'move';
            }
        }
    }




    dropTermin(event: DragEvent, dan: Date, sat: string) {
        event.preventDefault();

        const grupa = this.prevucenaGrupa;

        if (!grupa) {
            return;
        }

        if (!this.mozePrevuciGrupu(grupa)) {
            this.poruka = 'Pomeranje je dozvoljeno samo na zatvorenim terenima, halama i dvoranama';
            this.prevucenaGrupa = null;
            return;
        }

        const stariPocetak = new Date(grupa.pocetak);
        const stariKraj = new Date(grupa.kraj);


        const trajanje = stariKraj.getTime() - stariPocetak.getTime();

        if (!Number.isFinite(trajanje) || trajanje <= 0) {
            this.poruka = 'Trajanje termina nije ispravno';
            this.prevucenaGrupa = null;
            return;
        }

        const [sati, minuti] = sat.split(':').map(Number);
        const noviPocetak = new Date(dan);
        noviPocetak.setHours(sati, minuti, 0, 0);

        if (noviPocetak.getTime() <= Date.now()) {
            this.poruka = 'Termin se ne moze pomeriti u proslost';
            this.prevucenaGrupa = null;

            return;
        }

        const noviKraj = new Date(
            noviPocetak.getTime() + trajanje
        );




        
        this.prevucenaGrupa = null;

        this.objektiService.promeniTermin(
            grupa.id,
            noviPocetak.toISOString(),
            noviKraj.toISOString(),
            this.user.firmaId
        ).subscribe(response => {
            if (response.message == 'OK') {
                this.ucitajTermineZaposlenog();
                this.poruka = grupa.termini.length > 1 ? 'Spojeni termini su pomereni' : 'Termin je pomeren';
            }
            else {
                this.poruka = response.message;
            }
        });
    }



    promeniKalendarObjekat() {
        const objekat = this.kalendarObjekat();

        if ( !objekat?.tereni.some( teren => teren.naziv == this.kalendarTerenNaziv )) {
            this.kalendarTerenNaziv =
                objekat?.tereni[0]?.naziv || '';
        }

        this.sati = this.napraviSate(objekat?.radnoVremeOd || '08:00', objekat?.radnoVremeDo || '22:00');

        this.prevucenaGrupa = null;
    }

    promeniKalendarTeren() {
        this.prevucenaGrupa = null;
    }

    idiNaDanas() {
        this.postaviDaneKalendara(new Date());
    }

    promeniPocetniDatumKalendara() {
        const delovi = this.pocetniDatumKalendara.split('-').map(Number);

        if (delovi.length != 3 ||
            !delovi[0] ||
            !delovi[1] ||
            !delovi[2]) 
        {
            this.poruka = 'Pocetni datum kalendara nije ispravan';
            return;
        }

        const datum = new Date(delovi[0], delovi[1] - 1, delovi[2]);

        if (Number.isNaN(datum.getTime())) {
            this.poruka = 'Pocetni datum kalendara nije ispravan';
            return;
        }

        this.postaviDaneKalendara(datum);
    }

    postaviDaneKalendara(pocetak: Date) {
        const prviDan = new Date(pocetak);
        prviDan.setHours(0, 0, 0, 0);

        this.dani = [];

        for (let i = 0; i < 7; i++) {
            const dan = new Date(prviDan);
            dan.setDate(prviDan.getDate() + i);
            this.dani.push(dan);
        }

        this.pocetniDatumKalendara = `${prviDan.getFullYear()}-` + `${String(prviDan.getMonth() + 1).padStart(2, '0')}-` + `${String(prviDan.getDate()).padStart(2, '0')}`;
    }

    grupeUSlotu(dan: Date, sat: string) {
        return this.grupeTerminaZaKalendar().filter(grupa => {
            const [sati, minuti] = sat.split(':').map(Number);
            const pocetakSlota = new Date(dan);
            pocetakSlota.setHours(sati, minuti, 0, 0);

            const krajSlota = pocetakSlota.getTime() + 60 * 60 * 1000;
            const pocetakGrupe = new Date(grupa.pocetak).getTime();

            return pocetakGrupe >= pocetakSlota.getTime() && pocetakGrupe < krajSlota;
        });
    }

    vrhKartice(grupa: KalendarGrupa,  dan: Date, sat: string) {
        const [sati, minuti] = sat.split(':').map(Number);
        const pocetakSlota = new Date(dan);
        pocetakSlota.setHours(sati, minuti, 0, 0);

        const pomerajMinuti = (new Date(grupa.pocetak).getTime() -  pocetakSlota.getTime()) / (60 * 1000);

        return 4 + Math.max(0, pomerajMinuti) * 58 / 60;
    }

    visinaKartice(grupa: KalendarGrupa) {
        const trajanjeMinuti = ( new Date(grupa.kraj).getTime() -  new Date(grupa.pocetak).getTime() ) / (60 * 1000);

        return Math.max( 32, trajanjeMinuti * 58 / 60 - 8 );
    }

    napraviSate(od: string, doo: string) {
        const odMin = this.vremeUMinute(od || '08:00');
        const doMin = this.vremeUMinute(doo || '22:00');
        const sati: string[] = [];

        for (let min = odMin; min < doMin; min += 60) {

            sati.push(this.minutiUVreme(min));
            
        }

        return sati.length > 0 ? sati : ['08:00'];
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






    sacuvajObjekat() {
        this.poruka = '';
        const noviObjekat = !this.objekat.id;
        const cekaOdobrenje =
            noviObjekat || this.objekat.status != 'aktivan';

        if (!this.user || !this.user.firmaId) {
            this.poruka = 'Zaposleni nije povezan sa firmom';
            return;
        }

        if (
            !this.objekat.naziv ||
            !this.objekat.grad ||
            !this.objekat.adresa
        ) {
            this.poruka = 'Unesite naziv, grad i adresu objekta';
            return;
        }

        if (Number(this.objekat.cenaRezervacijePoSatu) <= 0) {
            this.poruka = 'Cena rezervacije mora biti veca od nule';
            return;
        }

        if (
            !this.objekat.radnoVremeOd ||
            !this.objekat.radnoVremeDo ||
            this.objekat.radnoVremeOd >= this.objekat.radnoVremeDo
        ) {
            this.poruka = 'Radno vreme objekta nije ispravno';
            return;
        }

        const dozvoljeniNedolasci =
            Number(this.objekat.dozvoljeniNedolasci);

        if (!Number.isInteger(dozvoljeniNedolasci) || dozvoljeniNedolasci < 0) {
            this.poruka = 'Broj dozvoljenih nedolazaka mora biti ceo broj nula ili veci';
           
            return;
        }

        if (!Array.isArray(this.objekat.tereni) || this.objekat.tereni.length < 2) {
            this.poruka = 'Objekat mora imati najmanje dva elementa';
            return;
        }

        const nazivi: string[] = [];
        let imaOtvorenTeren = false;

        for (let t of this.objekat.tereni) {
            const naziv = (t.naziv || '').trim().toLowerCase();
            const kapacitet = Number(t.kapacitet);

            if (!naziv || !t.sport || !t.tip || !t.vrsta ) {
                this.poruka = 'Unesite sve podatke za elemente objekta';
                return;
            }

            if (nazivi.includes(naziv)) {
                this.poruka = 'Nazivi elemenata u objektu moraju biti jedinstveni';
                return;
            }

            if (!Number.isInteger(kapacitet) || kapacitet < 1) {
                
                this.poruka = 'Kapacitet svakog elementa mora biti ceo broj veci od nule';
                return;
            }

            if ((t.opisOpreme || '').length > 300) {
                this.poruka = 'Opis opreme sme imati najvise 300 karaktera';

                return;
            }

            nazivi.push(naziv);

            if ( t.tip == 'otvoreni' && t.vrsta == 'teren' &&  kapacitet >= 4 ) {
                imaOtvorenTeren = true;
            }
        }

        if (!imaOtvorenTeren) {
            this.poruka = 'Objekat mora imati najmanje jedan otvoreni teren sa bar 4 mesta';
            return;
        }

        this.objekat.dozvoljeniNedolasci = dozvoljeniNedolasci;

        this.objektiService.sacuvajObjekat(this.objekat, this.user).subscribe(response => {
            this.poruka = response.message == 'OK' ? 'Objekat je sacuvan' : response.message;

            if (response.message == 'OK') {
                this.noviObjekat();
                this.ngOnInit();

                if (cekaOdobrenje) {
                    this.poruka = 'Objekat je poslat administratoru na odobrenje';
                }
                else {
                    this.poruka = 'Objekat je sacuvan';
                }
            }
        });
    }


    noviObjekat() {
        this.objekat = new SportskiObjekat();
        this.objekat.aktivan = false;
        this.objekat.status = 'na cekanju';
        this.objekat.dozvoljeniNedolasci = 3;
        this.objekat.radnoVremeOd = '08:00';
        this.objekat.radnoVremeDo = '22:00';
        this.objekat.tereni = [];
        this.izabraniObjekatId = '';
        this.teren = new Teren();
        this.teren.tip = 'otvoreni';
        this.teren.vrsta = 'teren';
        this.prikaziDodavanjeTerena = false;
        this.poruka = '';
    }

    sacuvajOpremu() {
        this.poruka = '';

        const cena = Number(this.opremaForma.cena);
        const zalihe = Number(this.opremaForma.zalihe);

        this.opremaForma.naziv = this.opremaForma.naziv.trim();
        this.opremaForma.sport = this.opremaForma.sport.trim();

        if (!this.opremaForma.naziv || !this.opremaForma.sport) {
            this.poruka = 'Unesite naziv i sport opreme';
            return;
        }

        if (!Number.isFinite(cena) || cena <= 0) {
            this.poruka = 'Cena opreme mora biti veca od nule';
            return;
        }

        if (!Number.isInteger(zalihe) || zalihe < 0) {
            this.poruka = 'Zalihe moraju biti ceo broj nula ili veci';
            return;
        }

        if (!this.opremaForma.slika || !this.opremaForma.slika.startsWith('data:image/')) {
            this.poruka = 'Dodajte ispravnu sliku opreme';
            return;
        }

        this.opremaForma.cena = cena;
        this.opremaForma.zalihe = zalihe;

        this.objektiService.sacuvajOpremu(
            this.opremaForma,
            this.user.firmaId
        ).subscribe(response => {
            this.poruka = response.message == 'OK' ? 'Oprema je sacuvana' : response.message;

            if (response.message == 'OK') {
                this.opremaForma = new Oprema();

                if (this.opremaSlikaInput) {
                    this.opremaSlikaInput.nativeElement.value = '';
                }

                this.ngOnInit();
                this.poruka = 'Oprema je sacuvana';
            }
        });
    }

    
    izmeniOpremu(o: Oprema) {
        this.opremaForma = JSON.parse(JSON.stringify(o)) as Oprema;

        if (this.opremaSlikaInput) {
            this.opremaSlikaInput.nativeElement.value = '';
        }
    }

    mozeEvidencija(termin: Termin) {
        const pocetak = new Date(termin.pocetak).getTime();
        const sada = this.trenutnoVreme;
        return sada >= pocetak && sada <= pocetak + 10 * 60 * 1000 && !termin.prisustvo && this.terminPrihvacen(termin);
    }





    terminPrihvacen(termin: Termin) {
        return termin.status == 'prihvacen';
    }



    izvestajPopunjenost() {
        if (!this.izvestajObjekatId || !this.mesecPopunjenosti) {
            this.poruka = 'Izaberite objekat i mesec';
            return;
        }

        window.open(
            this.objektiService.urlIzvestajPopunjenost(
                this.user.firmaId,
                this.izvestajObjekatId,
                this.mesecPopunjenosti
            ),
            '_blank'
        );
    }

    izvestajOprema() {
        if (!this.mesecPrometaOpreme) {
            this.poruka = 'Izaberite mesec';
            return;
        }

        window.open(
            this.objektiService.urlIzvestajOprema(
                this.user.firmaId,
                this.mesecPrometaOpreme
            ),
            '_blank'
        );
    }

    logout() {
        localStorage.removeItem('ulogovan');
        this.router.navigate(['/']);
    }
}

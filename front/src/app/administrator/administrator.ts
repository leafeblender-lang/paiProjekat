import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SportskiObjekat } from '../models/sportski-objekat';
import { Trener } from '../models/trener';
import { User } from '../models/user';
import { AdminService } from '../services/admin';

@Component({
    selector: 'app-administrator',
    imports: [FormsModule],
    templateUrl: './administrator.html',
    styleUrl: './administrator.css',
})
export class Administrator {
    private router = inject(Router);
    private adminService = inject(AdminService);

    user = new User();
    korisnici: User[] = [];
    korisnikZaIzmenu: User | null = null;
    zahteviRegistracije: User[] = [];
    zahteviObjekata: SportskiObjekat[] = [];
    treneri: Trener[] = [];
    sportovi: string[] = [];
    noviSport = '';
    poruka = '';

    ngOnInit() {
        const data = localStorage.getItem('ulogovan');

        if (!data) {
            this.router.navigate(['/admin-login']);
        }
        else {
            this.user = JSON.parse(data);

            if (this.user.tip != 'administrator') {
                this.router.navigate(['/admin-login']);
            }
            else {
                this.ucitajPodatke();
            }
        }
    }

    ucitajPodatke() {
        this.adminService
            .dohvatiKorisnike(this.user.kor_ime)
            .subscribe(korisnici => this.korisnici = korisnici);

        this.adminService
            .dohvatiZahteveRegistracije(this.user.kor_ime)
            .subscribe(zahtevi => this.zahteviRegistracije = zahtevi);

        this.adminService
            .dohvatiZahteveObjekata(this.user.kor_ime)
            .subscribe(objekti => this.zahteviObjekata = objekti);

        this.adminService
            .dohvatiTrenere(this.user.kor_ime)
            .subscribe(treneri => this.treneri = treneri);

        this.adminService
            .dohvatiSportove()
            .subscribe(sportovi => this.sportovi = sportovi);
    }

    izaberiKorisnikaZaIzmenu(korisnik: User) {
        const kopija = new User();

        kopija._id = korisnik._id;
        kopija.kor_ime = korisnik.kor_ime;
        kopija.ime = korisnik.ime;
        kopija.prezime = korisnik.prezime;
        kopija.telefon = korisnik.telefon;
        kopija.mejl = korisnik.mejl;
        kopija.tip = korisnik.tip;
        kopija.status = korisnik.status;
        kopija.profilnaSlika = korisnik.profilnaSlika;
        kopija.sportovi = korisnik.sportovi.slice();
        kopija.firmaId = korisnik.firmaId;

        this.korisnikZaIzmenu = kopija;
        this.poruka = '';
    }

    sacuvajIzmeneKorisnika() {
        this.poruka = '';

        if (!this.korisnikZaIzmenu) {
            this.poruka = 'Korisnik nije izabran';
        }
        else if (
            !this.korisnikZaIzmenu.ime.trim() ||
            !this.korisnikZaIzmenu.prezime.trim() ||
            !this.korisnikZaIzmenu.telefon.trim() ||
            !this.korisnikZaIzmenu.mejl.trim()
        ) {
            this.poruka = 'Niste uneli sve podatke';
        }
        else {
            this.adminService.izmeniKorisnika(
                this.user.kor_ime,
                this.korisnikZaIzmenu
            ).subscribe(response => {
                if (response.message == 'OK') {
                    this.korisnikZaIzmenu = null;
                    this.poruka = 'Korisnicki nalog je izmenjen';
                    this.ucitajPodatke();
                }
                else {
                    this.poruka = response.message;
                }
            });
        }
    }

    otkaziIzmenuKorisnika() {
        this.korisnikZaIzmenu = null;
    }

    obrisiKorisnika(korisnik: User) {
        this.poruka = '';

        if (confirm(`Da li zelite da obrisete nalog ${korisnik.kor_ime}?`)) {
            this.adminService.obrisiKorisnika(
                this.user.kor_ime,
                korisnik._id
            ).subscribe(response => {
                if (response.message == 'OK') {
                    if (this.korisnikZaIzmenu?._id == korisnik._id) {
                        this.korisnikZaIzmenu = null;
                    }

                    this.poruka = 'Korisnicki nalog je obrisan';
                    this.ucitajPodatke();
                }
                else {
                    this.poruka = response.message;
                }
            });
        }
    }

    promeniStatusObjekta(objekat: SportskiObjekat, status: string) {
        this.poruka = '';

        this.adminService.promeniStatusObjekta(
            this.user.kor_ime,
            objekat.id,
            status
        ).subscribe(response => {
            if (response.message == 'OK') {
                if (status == 'aktivan') {
                    this.poruka = 'Sportski objekat je odobren';
                }
                else {
                    this.poruka = 'Sportski objekat je odbijen';
                }

                this.ucitajPodatke();
            }
            else {
                this.poruka = response.message;
            }
        });
    }

    promeniStatusRegistracije(korisnik: User, status: string) {
        this.poruka = '';

        this.adminService.promeniStatusRegistracije(
            this.user.kor_ime,
            korisnik._id,
            status
        ).subscribe(response => {
            if (response.message == 'OK') {
                if (status == 'aktivan') 
                {
                    this.poruka = 'Zahtev za registraciju je odobren';
                }
                else {
                    this.poruka = 'Zahtev za registraciju je odbijen';
                }

                this.ucitajPodatke();
            }
            else {
                this.poruka = response.message;
            }
        });
    }




    deaktivirajTrenera(trener: Trener) {
        this.poruka = '';

        this.adminService.promeniStatusTrenera(
            this.user.kor_ime,
            trener.id,
            'neaktivan'
        ).subscribe(response => {
            if (response.message == 'OK') {

                this.poruka = 'Trener je deaktiviran';
                this.ucitajPodatke();

            }
            else {
                this.poruka = response.message;
            }
        });
    }

    dodajSport() {
        this.poruka = '';
        this.noviSport = this.noviSport.trim();

        if (!this.noviSport) {
            this.poruka = 'Unesite naziv sporta';
        }
        else {
            this.adminService.dodajSport(this.user.kor_ime, this.noviSport).subscribe(response => {
                    if (response.message == 'OK')
                    {
                        this.noviSport = '';
                        this.poruka = 'Sport je dodat';
                        this.ucitajPodatke();
                    }
                    else 
                    {
                        this.poruka = response.message;
                    }
                });
        }
    }

    logout() {
        localStorage.removeItem('ulogovan');
        this.router.navigate(['/admin-login']);
    }
}

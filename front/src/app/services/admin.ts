import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Poruka } from '../models/poruka';
import { SportskiObjekat } from '../models/sportski-objekat';
import { Trener } from '../models/trener';
import { User } from '../models/user';

@Injectable({
    providedIn: 'root',
})
export class AdminService {
    private http = inject(HttpClient);
    private uri = 'http://localhost:4000/admin';

    dohvatiSportove() {
        return this.http.get<string[]>(`${this.uri}/sportovi`);
    }

    dohvatiTrenere(adminKorIme: string) {
        return this.http.post<Trener[]>(`${this.uri}/treneri`, {
            adminKorIme: adminKorIme
        });
    }

    dohvatiZahteveRegistracije(adminKorIme: string) {
        return this.http.post<User[]>(`${this.uri}/registracije`, {
            adminKorIme: adminKorIme
        });
    }

    dohvatiKorisnike(adminKorIme: string) {
        return this.http.post<User[]>(`${this.uri}/korisnici`, {
            adminKorIme: adminKorIme
        });
    }

    izmeniKorisnika(adminKorIme: string, korisnik: User) {
        return this.http.post<Poruka>(`${this.uri}/korisnik/izmeni`, {
            adminKorIme: adminKorIme,
            korisnik: korisnik
        });
    }

    obrisiKorisnika(adminKorIme: string, korisnikId: string) {
        return this.http.post<Poruka>(`${this.uri}/korisnik/obrisi`, {
            adminKorIme: adminKorIme,
            korisnikId: korisnikId
        });
    }

    promeniStatusRegistracije(adminKorIme: string, korisnikId: string, status: string) {
        return this.http.post<Poruka>(
            `${this.uri}/registracija/status`,
            {
                adminKorIme: adminKorIme,
                korisnikId: korisnikId,
                status: status
            }
        );
    }

    dohvatiZahteveObjekata(adminKorIme: string) {
        return this.http.post<SportskiObjekat[]>(
            `${this.uri}/objekti`,
            {
                adminKorIme: adminKorIme
            }
        );
    }

    promeniStatusObjekta(adminKorIme: string, objekatId: string,  status: string) {
        return this.http.post<Poruka>(
            `${this.uri}/objekat/status`,
            {
                adminKorIme: adminKorIme,
                objekatId: objekatId,
                status: status
            }
        );
    }

    promeniStatusTrenera(adminKorIme: string, id: string, status: string) {
        return this.http.post<Poruka>(`${this.uri}/trener/status`, {
            adminKorIme: adminKorIme,
            id: id,
            status: status
        });
    }

    dodajSport(adminKorIme: string, naziv: string) {
        return this.http.post<Poruka>(`${this.uri}/sport/dodaj`, {
            adminKorIme: adminKorIme,
            naziv: naziv
        });
    }
}

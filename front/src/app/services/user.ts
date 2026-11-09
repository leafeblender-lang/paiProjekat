import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Poruka } from '../models/poruka';
import { User } from '../models/user';

@Injectable({
  providedIn: 'root',
})
export class UserService {
    private http = inject(HttpClient);
    private uri = 'http://localhost:4000/user';

    login(kor_ime: string, lozinka: string) {
        const data = {
        kor_ime: kor_ime,
        lozinka: lozinka,
        };
        return this.http.post<User>(`${this.uri}/login`, data);
    }

    forgotPassword(korisnik: string) {
        return this.http.post<Poruka>(`${this.uri}/forgotpassword`, { korisnik });
    }

    resetPassword(token: string, lozinka: string) {
        const data= { 
            token: token, 
            lozinka: lozinka 
        }
        return this.http.post<Poruka>(`${this.uri}/resetpassword`, data);
    }
    adminLogin(kor_ime: string, lozinka: string) {
        const data = {
        kor_ime: kor_ime,
        lozinka: lozinka,
        };
        return this.http.post<User>(`${this.uri}/adminlogin`, data);
    }

    registracija(user: User,maticniBroj:string,pib:string,adresaSedista: string,nazivFirme:string) {
        const data={
            user:user,
            maticniBroj:maticniBroj,
            pib:pib,
            adresaSedista: adresaSedista,
            nazivFirme: nazivFirme
        }
        return this.http.post<Poruka>(`${this.uri}/registruj`, data);
    }


    updateProfile(user: User) {
        return this.http.post<Poruka>(`${this.uri}/updateprofil`, user);
    }


}


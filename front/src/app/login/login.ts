import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { UserService } from '../services/user';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {

    kor_ime = '';
    lozinka = '';
    poruka = '';
    private userService = inject(UserService);
    private router = inject(Router);
    link='';
    login() {
        this.poruka = '';

        if (!this.kor_ime && !this.lozinka) {
            this.poruka = 'Unesite korisnicko ime i lozinku';
            return;
        }
        else if (!this.kor_ime) {
            this.poruka = 'Unesite korisnicko ime';
            return;
        }
        else if (!this.lozinka) {
            this.poruka = 'Unesite lozinku';
            return;
        }


        
        this.userService.login(this.kor_ime, this.lozinka).subscribe(user => {
            if (!user) {
                this.poruka = 'Pogresno korisnicko ime ili lozinka';
                return;
            }


            localStorage.setItem('ulogovan', JSON.stringify(user));
            if (user.tip == 'sportista') this.router.navigate(['/sportista']);
            else if (user.tip == 'zaposleni') this.router.navigate(['/zaposleni']);
        });
    }
}

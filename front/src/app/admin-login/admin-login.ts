import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { UserService } from '../services/user';

@Component({
  selector: 'app-admin-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './admin-login.html',
  styleUrl: './admin-login.css',
})
export class AdminLogin {
    private userService = inject(UserService);
    private router = inject(Router);

    kor_ime = '';
    lozinka = '';
    poruka = '';

    login() {
        this.poruka = '';

        if(!this.kor_ime || !this.lozinka) {
            this.poruka = 'Unesite korisnicko ime i lozinku';
            return;
        }

        this.userService.adminLogin(this.kor_ime, this.lozinka).subscribe(user => {
            if(!user) {
                this.poruka = 'Losi podaci';
                return;
            }

            localStorage.setItem('ulogovan', JSON.stringify(user));
            if(user.tip=='administrator')
                this.router.navigate(['/administrator']);
        });
    }
}

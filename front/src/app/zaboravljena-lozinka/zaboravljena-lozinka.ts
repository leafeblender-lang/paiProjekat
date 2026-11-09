import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService } from '../services/user';

@Component({
  selector: 'app-zaboravljena-lozinka',
  imports: [FormsModule],
  templateUrl: './zaboravljena-lozinka.html',
  styleUrl: './zaboravljena-lozinka.css',
})
export class ZaboravljenaLozinka {
    private userService = inject(UserService);
    private router = inject(Router);

    korisnik = '';
    poruka = '';
    link = '';


    nazadNaPrijavu(){
        this.router.navigate(['/login']);
    }

    posalji() {
        this.poruka = '';
        this.link = '';

        if (!this.korisnik) {
            this.poruka = 'Unesite korisnicko ime ili mejl';
            return;
        }

        this.userService.forgotPassword(this.korisnik).subscribe(data => {
            this.poruka = data.message;
            this.link = data.resetLink || '';
        });
    }
}

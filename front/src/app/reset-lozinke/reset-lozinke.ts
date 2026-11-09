import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from '../services/user';
@Component({
  selector: 'app-reset-lozinke',
  imports: [FormsModule],
  templateUrl: './reset-lozinke.html',
  styleUrl: './reset-lozinke.css',
})
export class ResetLozinke {
    private userService = inject(UserService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);

    token = '';
    lozinka = '';
    ponovljenaLozinka = '';
    poruka = '';

    ngOnInit() {
        this.token = this.route.snapshot.paramMap.get('token') || '';
    }

    promeniLozinku() {
        this.poruka = '';

        if (!this.token) {
            this.poruka = 'Neispravan link';
            return;
        }

        if (!this.lozinka) {
            this.poruka = 'Unesite lozinku';
            return;
        }
        if(!this.ponovljenaLozinka) {
            this.poruka = 'Potvrdite lozinku';
            return;
        }

        if (this.lozinka != this.ponovljenaLozinka) {
            this.poruka = 'Lozinke se ne poklapaju';
            return;
        }

        this.userService.resetPassword(this.token, this.lozinka).subscribe(data => {
            if (data.message == 'OK') {
                alert('Lozinka je promenjena');
                this.router.navigate(['/login']);
            }
            else {
                this.poruka = data.message;
            }
        });
    }
}

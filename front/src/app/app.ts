import { Component } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, RouterLink],
    templateUrl: './app.html',
    styleUrl: './app.css'
})
export class App {
    title = 'SportSphere Hub';

    constructor(private router: Router) {}

    tipUlogovanog() {
        const podaci = localStorage.getItem('ulogovan');

        if (!podaci) return '';

        try {
            const user = JSON.parse(podaci);
            return user.tip || '';
        }
        catch {
            return '';
        }
    }

    ulogovan() {
        return this.tipUlogovanog() != '';
    }

    korisnickaPocetna() {
        const tip = this.tipUlogovanog();

        if (tip == 'sportista') return '/sportista';
        if (tip == 'zaposleni') return '/zaposleni';
        if (tip == 'administrator') return '/administrator';
        return '/';
    }

    logout() {
        const tip = this.tipUlogovanog();
        localStorage.removeItem('ulogovan');

        if (tip == 'administrator') {
            this.router.navigate(['/admin-login']);
        }
        else {
            this.router.navigate(['/login']);
        }
    }
}

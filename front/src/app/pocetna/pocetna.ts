import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Promocija } from '../models/promocija';
import { SportskiObjekat } from '../models/sportski-objekat';
import { Objekti } from '../services/objekti';

@Component({
  selector: 'app-pocetna',
  imports: [FormsModule, DatePipe],
  templateUrl: './pocetna.html',
  styleUrl: './pocetna.css',
})
export class Pocetna {
    private objektiService = inject(Objekti);
    private router = inject(Router);

    ukupnoAktivnih = 0;
    topObjekti: SportskiObjekat[] = [];
    promocije: Promocija[] = [];
    gradovi: string[] = [];
    sportovi: string[] = [];
    rezultati: SportskiObjekat[] = [];
    naziv = '';
    izabraniGradovi: string[] = [];
    izabranSport = '';
    tipTerena = '';
    izabranoSortPolje = '';
    sortSmer = 1;
    idObj=''


    ngOnInit(): void {
        this.objektiService.dohvatPodatkePocetna().subscribe(data => {
            this.ukupnoAktivnih = data.ukupnoAktivnih;
            this.topObjekti = data.topObjekti;
            this.promocije = data.promocije.sort(() => Math.random() - 0.5).slice(0, 3);
            this.gradovi = data.gradovi;
            this.sportovi = data.sportovi;
            
        });
    }




    sortiraj(polje: string) {
        if (this.izabranoSortPolje == polje) this.sortSmer = -this.sortSmer;
        else {
            this.izabranoSortPolje = polje;
            this.sortSmer = 1;
        }

        this.primeniSort();
        this.sacuvajPretragu();
    }


    primeniSort() {
        if (!this.izabranoSortPolje) return;

        this.rezultati = this.rezultati.sort((a, b) => {
            let prvi = this.vrednostZaSort(a, this.izabranoSortPolje).toLowerCase();
            let drugi = this.vrednostZaSort(b, this.izabranoSortPolje).toLowerCase();
            if (prvi > drugi) return this.sortSmer;
            if (prvi < drugi) return -this.sortSmer;
            return 0;
        });
    }

    

    vrednostZaSort(objekat: SportskiObjekat, polje: string) {
        if (polje == 'sport') return objekat.sportovi.join(', ');
        if (polje == 'grad') return objekat.grad || '';
        return objekat.naziv || '';
    }


    sacuvajPretragu() {
        localStorage.setItem('pocetnaPretraga', JSON.stringify({
            naziv: this.naziv,
            izabraniGradovi: this.izabraniGradovi,
            sport: this.izabranSport,
            tipTerena: this.tipTerena,
            izabranoSortPolje: this.izabranoSortPolje,
            sortSmer: this.sortSmer,
            rezultati: this.rezultati
        }));
    }



    oznakaSorta(polje: string) {
        if (this.izabranoSortPolje != polje) return '\u2191\u2193';
        if (this.sortSmer == 1) return '\u2191';
        return '\u2193';
    }


    detalji(id: string) {
        this.sacuvajPretragu();
        localStorage.setItem("objID",id);
        this.router.navigate(['/detalji-objekta'])
    }


    izaberiGradove(event: Event) {
        const select = event.target as HTMLSelectElement;

        this.izabraniGradovi = [];

        for (let option of select.selectedOptions) {
            this.izabraniGradovi.push(option.value);
        }
    }
    

    pretrazi() {
        this.objektiService.pretraga(this.naziv, this.izabraniGradovi, this.izabranSport, this.tipTerena).subscribe(rez => {
            this.rezultati = rez;
            this.primeniSort();
            this.sacuvajPretragu();
        });
    }

    otvoriLogin() {
        this.router.navigate(['/login']);
    }

}

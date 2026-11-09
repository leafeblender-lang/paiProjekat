import { Promocija } from './promocija';
import { SportskiObjekat } from './sportski-objekat';

export class Pocetna{
    ukupnoAktivnih = 0;
    topObjekti: SportskiObjekat[] = [];
    promocije: Promocija[] = [];
    gradovi: string[] = [];
    sportovi: string[] = [];
    sviObjekti: SportskiObjekat[] = [];
}

import { Component, ElementRef, inject, ViewChild } from '@angular/core';
import { createAvatar } from '@dicebear/core';
import { micah } from '@dicebear/collection';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { User } from '../models/user';
import { AdminService } from '../services/admin';
import { UserService } from '../services/user';

@Component({
  selector: 'app-registracija',
  imports: [FormsModule],
  templateUrl: './registracija.html',
  styleUrl: './registracija.css',
})
export class Registracija {
    private userService = inject(UserService);
    private adminService = inject(AdminService);

    @ViewChild('profilnaInput')
    profilnaInput!: ElementRef<HTMLInputElement>;

    user = new User();
    ponovljenaLozinka = '';
    poruka = '';
    avatar = '';
    sportovi: string[] = [];
    otvoren=false;

    pib=''
    maticniBroj=''
    adresaSedista=''
    nazivFirme=''


    ngOnInit(): void {
        this.user = new User();
        this.user.tip = 'sportista';
        this.ponovljenaLozinka = '';
        this.poruka = '';
        this.avatar = '';
        this.otvoren = false;
        this.adresaSedista = '';
        this.pib = '';
        this.maticniBroj = '';
        this.nazivFirme = '';

        this.adminService.dohvatiSportove().subscribe(sportovi => {
            this.sportovi = sportovi;
        });
    }




    router=inject(Router);

     
    registrujSe() {
        this.poruka = '';

        if (
            !this.user.kor_ime ||
            !this.user.lozinka ||
            !this.ponovljenaLozinka ||
            !this.user.ime ||
            !this.user.prezime ||
            !this.user.telefon ||
            !this.user.mejl ||
            (
                this.user.tip == 'zaposleni' &&
                (!this.nazivFirme || !this.adresaSedista || !this.maticniBroj || !this.pib)
            )
        ) {
            this.poruka = 'Unesite sve podatke';
            return;
        }

        if(!this.proveriLozinku(this.user.lozinka)) {
        this.poruka = '8-12 карактера, бар једно велико слово, један број и једанспецијални карактер, мора почињати словом';
            return;
        }

        if (this.user.lozinka != this.ponovljenaLozinka) {
            this.poruka = 'Lozinke se ne poklapaju';
            return;
        }

        if (this.user.tip == 'zaposleni') {

            if (!this.proveriPib(this.pib)) {
                this.poruka = 'PIB mora imati 9 cifara i ne sme pocinjati nulom';
                return;
            }

        }   



        this.userService.registracija(this.user,this.maticniBroj,this.pib,this.adresaSedista,this.nazivFirme).subscribe(response => {
            if (response.message == 'OK') {
                alert('Zahtev za registraciju je poslat administratoru');
                this.profilnaInput.nativeElement.value = '';
                this.ngOnInit();
                
            } else {
                this.poruka = response.message;
            }
        });
    }


    proveriPib(pib: string): boolean {

        if (pib.length != 9) {
            return false;
        }

        if (pib[0] == '0') {
            return false;
        }


        for (let c of pib) {
            if (c < '0' || c > '9') {
                return false;
            }
        }

        return true;
    }



    
    promeniSport(event: Event, sport: string) {

        const input = event.target as HTMLInputElement;
        if (input.checked) {
            if (this.user.sportovi.length == 5) {
                input.checked = false;
                alert( 'Mozete izabrati najvise pet sportova');
                return;
            }
            else this.user.sportovi.push(sport);
        } else {
            this.user.sportovi = this.user.sportovi.filter(s => s != sport);
        }
    }

    sportVecDodat(sport: string): boolean {
        return  this.user.sportovi.includes(sport)
    }
   

    generisiAvatar() {
        const seed = Math.floor(Math.random() * 10000).toString();

        const avatar = createAvatar(micah, {
            seed: seed,
            size: 160,
            backgroundColor: [
                            'd1fae5',
                            'e0f2fe',
                            'fef3c7',
                            'fce7f3',
                            'ede9fe',
                            'fee2e2',
                            'cffafe',
                            'f3f4f6'
                        ]
        });

        this.avatar = avatar.toDataUri();
        this.user.profilnaSlika = '';
    }


    sacuvajAvatar() {
        if (!this.avatar) return;
        const image = new Image();
        image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 160;
            canvas.height = 160;
            const context = canvas.getContext('2d');
            if (!context) {
                this.poruka = 'Greska';
                return;
            }
            context.drawImage(image, 0, 0, 160, 160);
            this.user.profilnaSlika = canvas.toDataURL('image/png');
            this.avatar = '';
        };
        image.onerror = () => {
            this.poruka = 'Greska';
        };
        image.src = this.avatar;
        this.profilnaInput.nativeElement.value = '';
    }


    uploadSlike(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            this.user.profilnaSlika = String(reader.result);
            this.avatar = '';
        };
        reader.readAsDataURL(file);
    }

    
    nazadNaPri(){
        this.router.navigate(['/login']);
    }




   


    proveriLozinku(lozinka: string) {
    if (lozinka.length < 8 || lozinka.length > 12) {
        return false;
    }

    const prvi = lozinka.charAt(0);
    if (!((prvi >= 'A' && prvi <= 'Z') || (prvi >= 'a' && prvi <= 'z'))) {
        return false;
    }

    let imaVeliko = false;
    let imaBroj = false;
    let imaSpecijalni = false;

    for (let i = 0; i < lozinka.length; i++) {
        const c = lozinka.charAt(i);

        if (c >= 'A' && c <= 'Z') {
            imaVeliko = true;
        }
        else if (c >= '0' && c <= '9') {
            imaBroj = true;
        }
        else if (!((c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z'))) {
            imaSpecijalni = true;
        }
    }

    return imaVeliko && imaBroj && imaSpecijalni;
}

}

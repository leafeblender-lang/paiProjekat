import * as express from 'express';
import { Resend } from 'resend';
import UserModel from '../models/user';
import PasswordResetModel from '../models/passwordReset';
import { sifruj, makeToken, proveriPass } from '../security/security';
import FirmaModel from '../models/firma';
import SportModel from '../models/sport';

function publicUser(user: any) {
    return {
        kor_ime: user.kor_ime,
        ime: user.ime,
        prezime: user.prezime,
        telefon: user.telefon,
        mejl: user.mejl,
        tip: user.tip,
        profilnaSlika: user.profilnaSlika,
        sportovi: user.sportovi ?? [],
        firmaId: user.firmaId || '',
        status: user.status
    };
}


export class UserController {

    login = (req: express.Request, res: express.Response) => {
        const kor_ime = req.body.kor_ime;
        const uneta_lozinka = req.body.lozinka;

        UserModel.findOne({ kor_ime: kor_ime, tip: { $ne: 'administrator' }, status: 'aktivan' }).then(user => {
            if (!user) {
                res.json(null);
                return;
            }

            if (!proveriPass(uneta_lozinka, user.lozinka!)) {
                res.json(null);
                return;
            }

            res.json(publicUser(user));
        }).catch(err => {
            console.log(err);
            res.json(null);
        });
    }



    forgotPassword = (req: express.Request, res: express.Response) => {
        const kor = req.body.korisnik;

        UserModel.findOne({ $or: [{ kor_ime: kor }, { mejl: kor }], status: 'aktivan' })
            .then(user => {
                if (!user) {
                    res.json({ message: 'Ako korisnik postoji link je poslat na mejl' });
                    return;
                }

                const token = makeToken();
                const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
                const frontendUrl = 'http://localhost:4200';
                const resetLink = `${frontendUrl}/reset-lozinke/${token}`;

                PasswordResetModel.deleteMany({ kor_ime: user.kor_ime, used: false }).then(() => {
                    PasswordResetModel.insertOne({
                        kor_ime: user.kor_ime,
                        token: token,
                        expiresAt: expiresAt,
                        used: false
                    }).then(() => {
                        if (!user.mejl) {
                            res.json({message: 'Greska'});
                            return;
                        }
                        this.sendResetEmail(user.mejl, resetLink).then(sent => {
                            if (sent) {
                                res.json({ message: 'Link za reset lozinke je poslat na mejl', resetLink: resetLink});
                            }
                            else {
                                res.json({
                                    message: 'Greska'
                                });
                            }
                        })
                            .catch(err => {
                                console.log(err);

                                if (!res.headersSent) {
                                    res.json({
                                        message: 'Greska pri slanju mejla'
                                    });
                                }
                            });
                    })
                        .catch(err => {
                            console.log(err);

                            if (!res.headersSent) {
                                res.json({
                                    message: 'Greska'
                                });
                            }
                        });
                })
                    .catch(err => {
                        console.log(err);

                        if (!res.headersSent) {
                            res.json({
                                message: 'Greska'
                            });
                        }
                    });
            })
            .catch(err => {
                console.log(err);

                if (!res.headersSent) {
                    res.json({
                        message: 'Greska nema korisnika'
                    });
                }
            });
    };





    private sendResetEmail(to: string, resetLink: string) {
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) return Promise.resolve(false);

        const resend = new Resend(apiKey);
        const from = 'SportSphere Hub <noreply@medpualic.com>';

        return resend.emails.send({
            from: from,
            to: [to],
            subject: 'PIA reset lozinke',
            html: `<p>Link za postavljanje nove lozinke vazi 30 minuta.</p><p><a href="${resetLink}">${resetLink}</a></p>`
        }).then(result => {
            if (result.error) {
                console.log(result.error);
                return false;
            }

            return true;
        });
    }



    resetPassword = (req: express.Request, res: express.Response) => {
        const token = req.body.token;
        const lozinka = req.body.lozinka;

        if (!token || !lozinka) {
            res.json({ message: 'Greska' });
            return;
        }

        if (!this.proveriLozinku(lozinka)) {
            res.json({ message: 'Lozinka nije u ispravnom formatu' });
            return;
        }

        PasswordResetModel.findOne({
            token: token,
            used: false,
            expiresAt: { $gt: new Date() }
        }).then(resetPas => {
            if (!resetPas) {
                res.json({ message: 'Link je istekao' });
                return;
            }

            UserModel.updateOne({ kor_ime: resetPas.kor_ime }, { $set: { lozinka: sifruj(lozinka) } }).then(() => {
                PasswordResetModel.updateOne(
                    { _id: resetPas._id },
                    { $set: { used: true } }
                ).then(() => {
                    res.json({ message: 'OK' });
                });
            });
        }).catch(err => {
            console.log(err);
            res.json({ message: 'Greska' });
        });
    }


    proveriLozinku(lozinka: string) {
        if (lozinka.length < 8 || lozinka.length > 12) {
            return false;
        }

        const prvi = lozinka.charAt(0);
        if (!((prvi >= 'A' && prvi <= 'Z') || (prvi >= 'a' && prvi <= 'z'))) {
            return false;
        }

        let velikoS = false;
        let imaBroj = false;
        let imaSpecijalni = false;

        for (let i = 0; i < lozinka.length; i++) {
            const c = lozinka.charAt(i);

            if (c >= 'A' && c <= 'Z') {
                velikoS = true;
            }
            else if (c >= '0' && c <= '9') {
                imaBroj = true;
            }
            else if (!(( c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z'))) 
            {
                imaSpecijalni = true;
            }
        }
        return (velikoS && imaBroj && imaSpecijalni);
    }

    adminLogin = (req: express.Request, res: express.Response) => {
        const kor_ime = req.body.kor_ime;
        const uneta_lozinka = req.body.lozinka;

        UserModel.findOne({
            kor_ime: kor_ime,
            tip: 'administrator',
            status: 'aktivan'
        }).then(user => {
            if (!user) {
                res.json(null);
            }
            else if (!proveriPass(uneta_lozinka, user.lozinka!)) {
                res.json(null);
            }
            else {
                res.json(publicUser(user));
            }
        }).catch(err => {
            console.log(err);
            res.json(null);
        });
    }



    updateProfil = (req: express.Request, res: express.Response) => {
        const data = req.body;
        const sportovi = Array.isArray(data.sportovi) ? data.sportovi.map((sport: any) => String(sport).trim()) : [];

        if (sportovi.length > 5 || sportovi.some((sport: string) => !sport)) {
            res.json({
                message: 'Mozete izabrati najvise pet dozvoljenih sportova'
            });
        }
        else if (new Set(sportovi).size != sportovi.length) {
            res.json({ message: 'Sportovi ne smeju da se ponavljaju' });
        }
        else {
            SportModel.find({
                naziv: { $in: sportovi }
            }).then(dozvoljeniSportovi => {
                if (dozvoljeniSportovi.length != sportovi.length) {
                    res.json({
                        message: 'Izaberite samo sportove iz dozvoljene liste'
                    });
                }
                else {
                    UserModel.updateOne({ kor_ime: data.kor_ime }, {
                        $set: {
                            ime: data.ime,
                            prezime: data.prezime,
                            telefon: data.telefon,
                            mejl: data.mejl,
                            profilnaSlika: data.profilnaSlika,
                            sportovi: sportovi
                        }
                    }).then(() => {
                        res.json({ message: 'OK' });
                    }).catch(err => {
                        console.log(err);
                        res.json({
                            message: 'Greska pri azuriranju profila'
                        });
                    });
                }
            }).catch(err => {
                console.log(err);
                res.json({
                    message: 'Greska pri proveri sportova'
                });
            });
        }
    }




    registracija = (req: express.Request, res: express.Response) => {
        const user = req.body.user || {};
        const pib = req.body.pib;
        const maticniBroj = req.body.maticniBroj;
        const tip = user.tip;
        const nazivFirme = req.body.nazivFirme;
        const adresaSedista = req.body.adresaSedista;

        if (tip != 'sportista' && tip != 'zaposleni') {
            res.json({ message: 'Neispravan tip korisnika' });
        }
        else if (
            !user.kor_ime ||
            !user.lozinka ||
            !user.ime ||
            !user.prezime ||
            !user.telefon ||
            !user.mejl ||
            (
                tip == 'zaposleni' &&
                (!maticniBroj || !pib || !nazivFirme || !adresaSedista)
            )
        ) {
            res.json({ message: 'Niste uneli sve podatke' });
        }
        else if (!this.proveriLozinku(user.lozinka)) {
            res.json({ message: 'Lozinka losa' });
        }
        else if (!Array.isArray(user.sportovi) || user.sportovi.length > 5) {
            res.json({ message: 'Mozete izabrati najvise pet sportova' });
        }
        else {
            const sportovi = user.sportovi.map(
                (sport: any) => String(sport).trim()
            );
            const imaPrazanSport = sportovi.some(
                (sport: string) => !sport
            );
            const imaDuplikat =
                new Set(sportovi).size != sportovi.length;

            if (imaPrazanSport || imaDuplikat) {
                res.json({
                    message: 'Lista sportova nije ispravna'
                });
            }
            else {
                SportModel.find({
                    naziv: { $in: sportovi }
                }).then(dozvoljeniSportovi => {
                    if (dozvoljeniSportovi.length != sportovi.length) {
                        res.json({
                            message: 'Izaberite samo sportove iz dozvoljene liste'
                        });
                    }
                    else {
                        UserModel.findOne({
                            status: 'aktivan',
                            $or: [
                                { kor_ime: user.kor_ime },
                                { mejl: user.mejl }
                            ]
                        }).then(userr => {
                            if (userr) {
                                res.json({
                                    message: 'Korisnicko ime ili mejl vec postoje'
                                });
                            }
                            else if (tip == 'zaposleni') {
                                if (!this.proveriPib(pib)) {
                                    res.json({
                                        message: 'PIB nije ispravan'
                                    });
                                }
                                else if (!this.proveriMaticniBroj(maticniBroj)) {
                                    res.json({
                                        message: 'Maticni broj nije ispravan'
                                    });
                                }
                                else {
                                    FirmaModel.findOne({
                                        naziv: nazivFirme,
                                        adresaSedista: adresaSedista,
                                        maticniBroj: maticniBroj,
                                        pib: pib
                                    }).then(firma => {
                                        if (!firma) {
                                            res.json({
                                                message: 'Podaci o firmi nisu ispravni'
                                            });
                                        }
                                        else {
                                            UserModel.countDocuments({
                                                tip: 'zaposleni',
                                                firmaId: firma.id,
                                                status: 'aktivan'
                                            }).then(brojZaposlenih => {
                                                if (brojZaposlenih >= 2) {
                                                    res.json({
                                                        message: 'Firma moze imati najvise dva zaposlena naloga'
                                                    });
                                                }
                                                else {
                                                    UserModel.insertOne({
                                                        kor_ime: user.kor_ime,
                                                        lozinka: sifruj(user.lozinka),
                                                        ime: user.ime,
                                                        prezime: user.prezime,
                                                        telefon: user.telefon,
                                                        mejl: user.mejl,
                                                        tip: 'zaposleni',
                                                        profilnaSlika:
                                                            user.profilnaSlika ||
                                                            'xx.png',
                                                        sportovi: sportovi,
                                                        firmaId: firma.id,
                                                        status: 'na cekanju'
                                                    }).then(() => {
                                                        res.json({
                                                            message: 'OK'
                                                        });
                                                    }).catch(err => {
                                                        console.log(err);
                                                        res.json({
                                                            message: 'Greska pri registraciji zaposlenog'
                                                        });
                                                    });
                                                }
                                            }).catch(err => {
                                                console.log(err);
                                                res.json({
                                                    message: 'Greska pri proveri broja zaposlenih'
                                                });
                                            });
                                        }
                                    }).catch(err => {
                                        console.log(err);
                                        res.json({
                                            message: 'Greska pri proveri firme'
                                        });
                                    });
                                }
                            }
                            else {
                                UserModel.insertOne({
                                    kor_ime: user.kor_ime,
                                    lozinka: sifruj(user.lozinka),
                                    ime: user.ime,
                                    prezime: user.prezime,
                                    telefon: user.telefon,
                                    mejl: user.mejl,
                                    tip: tip,
                                    profilnaSlika:
                                        user.profilnaSlika || 'xx.png',
                                    sportovi: sportovi,
                                    firmaId: '',
                                    status: 'na cekanju'
                                }).then(() => {
                                    res.json({ message: 'OK' });
                                }).catch(err => {
                                    console.log(err);
                                    res.json({
                                        message: 'Greska pri registraciji sportiste'
                                    });
                                });
                            }
                        }).catch(err => {
                            console.log(err);
                            res.json({
                                message: 'Greska pri registraciji'
                            });
                        });
                    }
                }).catch(err => {
                    console.log(err);
                    res.json({
                        message: 'Greska pri proveri sportova'
                    });
                });
            }
        }
    }



    proveriMaticniBroj(maticniBroj: string): boolean {
        if (maticniBroj.length != 8) return false;

        for (let c of maticniBroj) {
            if (c < '0' || c > '9') 
                {return false;}
        }

        return true;
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
}

import * as express from 'express';
import SportModel from '../models/sport';
import SportskiObjekatModel from '../models/sportskiObjekat';
import TrenerModel from '../models/trener';
import UserModel from '../models/user';

export class AdminController {

    dohvatiSportove = (req: express.Request, res: express.Response) => {
        SportModel.find({}).sort({ naziv: 1 }).then(sportovi => {
            res.json(sportovi.map(sport => sport.naziv));
        }).catch(err => {
            console.log(err);
            res.json([]);
        });
    };

    dohvatiZahteveRegistracije = (req: express.Request, res: express.Response) => {
        const adminKorIme = req.body.adminKorIme.trim();

        UserModel.findOne({ kor_ime: adminKorIme, tip: 'administrator', status: 'aktivan' }).then(administrator => {
            if (administrator) {
                UserModel.find({
                    tip: { $in: ['sportista', 'zaposleni'] },
                    status: 'na cekanju'

                }).then(zahtevi => {
                    res.json(zahtevi);
                }).catch(err => {
                    console.log(err);
                    res.json([]);
                });
            }
            else {
                res.json({ message: 'Nemate pravo pristupa' });

            }
        }).catch(err => {
            console.log(err);
            res.json({ message: 'Greska' });
        });
    };

    dohvatiKorisnike = (req: express.Request, res: express.Response) => {
        const adminKorIme = String(req.body.adminKorIme || '').trim();

        UserModel.findOne({ kor_ime: adminKorIme, tip: 'administrator', status: 'aktivan' }).then(administrator => {
            if (!administrator) {
                res.json({ message: 'Nemate pravo pristupa' });
            }
            else {
                UserModel.find({}).sort({ tip: 1, kor_ime: 1 }).then(korisnici => {
                    res.json(korisnici);
                }).catch(err => {
                    console.log(err);
                    res.json([]);
                });
            }
        }).catch(err => {
            console.log(err);
            res.json({ message: 'Greska pri proveri administratora' });
        });
    };

    izmeniKorisnika = (req: express.Request, res: express.Response) => {
        const adminKorIme = String(req.body.adminKorIme || '').trim();
        const korisnik = req.body.korisnik || {};
        const korisnikId = String(korisnik._id || '').trim();
        const ime = String(korisnik.ime || '').trim();
        const prezime = String(korisnik.prezime || '').trim();
        const telefon = String(korisnik.telefon || '').trim();
        const mejl = String(korisnik.mejl || '').trim();
        const status = String(korisnik.status || '').trim();

        if (!korisnikId || !ime || !prezime || !telefon || !mejl) {
            res.json({ message: 'Niste uneli sve podatke' });
        }
        else if (!['aktivan', 'na cekanju', 'odbijen'].includes(status)) {
            res.json({ message: 'Status nije ispravan' });
        }
        else {
            UserModel.findOne({ kor_ime: adminKorIme, tip: 'administrator', status: 'aktivan' }).then(administrator => {
                if (!administrator) {
                    res.json({ message: 'Nemate pravo pristupa' });
                }
                else {
                    UserModel.findOne({ _id: korisnikId }).then(postojeciKorisnik => {
                        if (!postojeciKorisnik) {
                            res.json({ message: 'Korisnik nije pronadjen' });
                        }
                        else if (postojeciKorisnik.kor_ime == adminKorIme && status != 'aktivan') {
                            res.json({ message: 'Ne mozete deaktivirati nalog kojim ste prijavljeni' });
                        }
                        else {
                            UserModel.findOne({
                                _id: { $ne: korisnikId },
                                mejl: mejl
                            }).then(korisnikSaIstimMejlom => {
                                if (korisnikSaIstimMejlom) {
                                    res.json({ message: 'Korisnik sa tim mejlom vec postoji' });
                                }
                                else if (status == 'aktivan') {
                                    UserModel.findOne({
                                        _id: { $ne: korisnikId },
                                        kor_ime: postojeciKorisnik.kor_ime,
                                        status: 'aktivan'
                                    }).then(korisnikSaIstimImenom => {
                                        if (korisnikSaIstimImenom) {
                                            res.json({ message: 'Aktivan korisnik sa tim korisnickim imenom vec postoji' });
                                        }
                                        else if (postojeciKorisnik.tip == 'zaposleni') {
                                            UserModel.countDocuments({
                                                _id: { $ne: korisnikId },
                                                tip: 'zaposleni',
                                                firmaId: postojeciKorisnik.firmaId,
                                                status: 'aktivan'
                                            }).then(brojZaposlenih => {
                                                if (brojZaposlenih >= 2) {
                                                    res.json({ message: 'Firma vec ima dva aktivna zaposlena naloga' });
                                                }
                                                else {
                                                    UserModel.updateOne(
                                                        { _id: korisnikId },
                                                        {
                                                            $set: {
                                                                ime: ime,
                                                                prezime: prezime,
                                                                telefon: telefon,
                                                                mejl: mejl,
                                                                status: status
                                                            }
                                                        }
                                                    ).then(() => {
                                                        res.json({ message: 'OK' });
                                                    }).catch(err => {
                                                        console.log(err);
                                                        res.json({ message: 'Greska pri izmeni korisnika' });
                                                    });
                                                }
                                            }).catch(err => {
                                                console.log(err);
                                                res.json({ message: 'Greska pri proveri broja zaposlenih' });
                                            });
                                        }
                                        else {
                                            UserModel.updateOne(
                                                { _id: korisnikId },
                                                {
                                                    $set: {
                                                        ime: ime,
                                                        prezime: prezime,
                                                        telefon: telefon,
                                                        mejl: mejl,
                                                        status: status
                                                    }
                                                }
                                            ).then(() => {
                                                res.json({ message: 'OK' });
                                            }).catch(err => {
                                                console.log(err);
                                                res.json({ message: 'Greska pri izmeni korisnika' });
                                            });
                                        }
                                    }).catch(err => {
                                        console.log(err);
                                        res.json({ message: 'Greska pri proveri korisnickog imena' });
                                    });
                                }
                                else {
                                    UserModel.updateOne(
                                        { _id: korisnikId },
                                        {
                                            $set: {
                                                ime: ime,
                                                prezime: prezime,
                                                telefon: telefon,
                                                mejl: mejl,
                                                status: status
                                            }
                                        }
                                    ).then(() => {
                                        res.json({ message: 'OK' });
                                    }).catch(err => {
                                        console.log(err);
                                        res.json({ message: 'Greska pri izmeni korisnika' });
                                    });
                                }
                            }).catch(err => {
                                console.log(err);
                                res.json({ message: 'Greska pri proveri mejla' });
                            });
                        }
                    }).catch(err => {
                        console.log(err);
                        res.json({ message: 'Greska pri pronalazenju korisnika' });
                    });
                }
            }).catch(err => {
                console.log(err);
                res.json({ message: 'Greska pri proveri administratora' });
            });
        }
    };

    obrisiKorisnika = (req: express.Request, res: express.Response) => {
        const adminKorIme = String(req.body.adminKorIme || '').trim();
        const korisnikId = String(req.body.korisnikId || '').trim();

        if (!korisnikId) {
            res.json({ message: 'Korisnik nije izabran' });
        }
        else {
            UserModel.findOne({ kor_ime: adminKorIme, tip: 'administrator', status: 'aktivan' }).then(administrator => {
                if (!administrator) {
                    res.json({ message: 'Nemate pravo pristupa' });
                }
                else {
                    UserModel.findOne({ _id: korisnikId }).then(korisnik => {
                        if (!korisnik) {
                            res.json({ message: 'Korisnik nije pronadjen' });
                        }
                        else if (korisnik.kor_ime == adminKorIme) {
                            res.json({ message: 'Ne mozete obrisati nalog kojim ste prijavljeni' });
                        }
                        else {
                            UserModel.deleteOne({ _id: korisnikId }).then(() => {
                                res.json({ message: 'OK' });
                            }).catch(err => {
                                console.log(err);
                                res.json({ message: 'Greska pri brisanju korisnika' });
                            });
                        }
                    }).catch(err => {
                        console.log(err);
                        res.json({ message: 'Greska pri pronalazenju korisnika' });
                    });
                }
            }).catch(err => {
                console.log(err);
                res.json({ message: 'Greska pri proveri administratora' });
            });
        }
    };

    promeniStatusRegistracije = (req: express.Request, res: express.Response) => {
        const adminKorIme = req.body.adminKorIme.trim();
        const korisnikId = req.body.korisnikId.trim();
        const status = req.body.status.trim();


        if (!korisnikId) {
            res.json({ message: 'Greska' });
        }
        else if (!['aktivan', 'odbijen'].includes(status)) {
            res.json({ message: 'Greska' });
        }
        else {
            UserModel.findOne({ kor_ime: adminKorIme, tip: 'administrator', status: 'aktivan' }).then(administrator => {
                if (!administrator) {
                    res.json({ message: 'Nemate pravo pristupa' });
                }
                else {
                    UserModel.findOne({
                        _id: korisnikId,
                        tip: { $in: ['sportista', 'zaposleni'] },
                        status: 'na cekanju'
                    }).then(zahtev => {

                        if (!zahtev) {
                            res.json({ message: 'Zahtev nije pronadjen ili je vec obradjen' });
                        }
                        else if (status == 'odbijen') {
                            UserModel.updateOne(
                                { _id: zahtev._id, status: 'na cekanju' },
                                { $set: { status: 'odbijen' } }

                                ).then(result => {
                                if ((result as any).matchedCount == 0) {
                                    res.json({ message: 'Zahtev je vec obradjen' });
                                }
                                else {
                                    res.json({ message: 'OK' });
                                }
                            }).catch(err => {
                                console.log(err);
                                res.json({
                                     message: 'Greska pri odbijanju zahteva' });
                            });
                        }
                        else {
                            UserModel.findOne({
                                _id: { $ne: zahtev._id },
                                status: 'aktivan',
                                $or: [
                                    { kor_ime: zahtev.kor_ime },
                                    { mejl: zahtev.mejl }
                                ]
                            }).then(postojeciKorisnik => {
                                if (postojeciKorisnik) {
                                    res.json({
                                        message: 'Aktivan korisnik sa tim korisnickim imenom ili mejlom vec postoji'
                                    });
                                }
                                else if (zahtev.tip == 'zaposleni') {
                                    UserModel.countDocuments({
                                        tip: 'zaposleni',
                                        firmaId: zahtev.firmaId,
                                        status: 'aktivan'
                                    }).then(brojZaposlenih => {
                                        if (brojZaposlenih >= 2) {
                                            res.json({
                                                message: 'Firma vec ima dva aktivna zaposlena naloga'
                                            });
                                        }
                                        else {
                                            UserModel.updateOne(
                                                { _id: zahtev._id, status: 'na cekanju' },
                                                { $set: { status: 'aktivan' } }
                                            ).then(result => {
                                                if (result.matchedCount == 0) {
                                                    res.json({ message: 'Zahtev je vec obradjen' });
                                                
                                                }
                                                else {
                                                    res.json({ message: 'OK' });
                                                
                                                }
                                            }).catch(err => {
                                                console.log(err);
                                                res.json({ message: 'Greska pri odobravanju zahteva' });
                                            });
                                        }
                                    }).catch(err => {
                                        console.log(err);
                                        res.json({ 
                                            message: 'Greska pri proveri broja zaposlenih' });
                                    });
                                }
                                else {
                                    UserModel.updateOne(
                                        { _id: zahtev._id, status: 'na cekanju' },
                                        { $set: { status: 'aktivan' } }
                                    ).then(result => {
                                        if ((result as any).matchedCount == 0) {
                                            res.json({ message: 'Zahtev je vec obradjen' });
                                        }
                                        else {
                                            res.json({ message: 'OK' });
                                        }
                                    }).catch(err => {
                                        console.log(err);
                                        res.json({ message: 'Greska pri odobravanju zahteva' });
                                    });
                                }
                            }).catch(err => {
                                console.log(err);
                                res.json({ message: 'Greska pri proveri korisnickog imena i mejla' });
                            });
                        }
                    }).catch(err => {
                        console.log(err);
                        res.json({ message: 'Greska pri pronalazenju zahteva' });
                    });
                }
            }).catch(err => {
                console.log(err);
                res.json({ message: 'Greska pri proveri administratora' });
            });
        }
    };

    dohvatiZahteveObjekata = (req: express.Request, res: express.Response) => {
        const adminKorIme = String(req.body.adminKorIme || '').trim();

        UserModel.findOne({ kor_ime: adminKorIme, tip: 'administrator', status: 'aktivan' }).then(administrator => {
            if (!administrator) {
                res.json({ message: 'Nemate pravo pristupa' });
            }
            else {
                SportskiObjekatModel.find({ status: 'na cekanju', aktivan: false }).sort({ naziv: 1 }).then(objekti => {
                    res.json(objekti);
                }).catch(err => {
                    console.log(err);
                    res.json([]);
                });
            }
        }).catch(err => {
            console.log(err);
            res.json({ message: 'Greska pri proveri administratora' });
        });
    };

    promeniStatusObjekta = (req: express.Request, res: express.Response) => {
        const adminKorIme = req.body.adminKorIme.trim();
        const objekatId = req.body.objekatId.trim();
        const status = req.body.status.trim();

        if (!objekatId || !['aktivan', 'odbijen'].includes(status)) 
        {
            res.json({ message: 'Podaci nisu ispravni' });
        }
        else 
        {
            UserModel.findOne({ kor_ime: adminKorIme, tip: 'administrator', status: 'aktivan' }).then(administrator => {
                if (!administrator) {
                    res.json({ message: 'Nemate pravo pristupa' });
                }
                else {
                    let aktivan = false;

                    if (status == 'aktivan') {
                        aktivan = true;
                    }

                    SportskiObjekatModel.updateOne(
                        { id: objekatId, status: 'na cekanju', aktivan: false },
                        { $set: { status: status, aktivan: aktivan } }
                    ).then(result => {
                        if ((result as any).matchedCount == 0) {
                            res.json({ message: 'Zahtev nije pronadjen ili je vec obradjen' });
                        }
                        else {
                            res.json({ message: 'OK' });
                        }
                    }).catch(err => {
                        console.log(err);
                        res.json({ message: 'Greska pri promeni statusa objekta' });
                    });
                }
            }).catch(err => {
                console.log(err);
                res.json({ message: 'Greska pri proveri administratora' });
            });
        }
    };











    dohvatiTrenere = (req: express.Request, res: express.Response) => {
        const adminKorIme = req.body.adminKorIme.trim();

        UserModel.findOne({ kor_ime: adminKorIme, tip: 'administrator', status: 'aktivan' }).then(administrator => {
            if (!administrator) {
                res.json({ message: 'Nemate pravo pristupa' });
            }
            else {

                TrenerModel.find({}).sort({ ime: 1 }).then(treneri => {
                    res.json(treneri);
                }).catch(err => {

                    console.log(err);
                    res.json([]);
                });
            }
        }).catch(err => {
            console.log(err);
            res.json({ message: 'Greska pri proveri administratora' });
        });
    };

    promeniStatusTrenera = (req: express.Request, res: express.Response) => {

        const adminKorIme = req.body.adminKorIme.trim();
        const id =  req.body.id.trim();
        const status = req.body.status.trim();

        if (!id || !['aktivan', 'neaktivan'].includes(status)) {
            res.json({ message: 'Podaci nisu ispravni' });
        }
        else {

            UserModel.findOne({ kor_ime: adminKorIme, tip: 'administrator', status: 'aktivan' }).then(administrator => {
                if (!administrator) {
                    res.json({ message: 'Nemate pravo pristupa' });
                }
                else {
                    TrenerModel.updateOne({ id: id }, { $set: { status: status } }).then(result => {
                        if ((result as any).matchedCount == 0) {
                            res.json({ message: 'Trener nije pronadjen' });
                        } else {
                            res.json({ message: 'OK' });
                        }
                    }).catch(err => {
                        console.log(err);
                        res.json({ message: 'Greska pri promeni statusa trenera' });
                    });
                }
            }).catch(err => {
                console.log(err);
                res.json({ message: 'Greska pri proveri administratora' });
            });


        }

    };




    dodajSport = (req: express.Request, res: express.Response) => {
        const adminKorIme = req.body.adminKorIme.trim();
        const naziv = req.body.naziv.trim().toLowerCase();

        if (!naziv) {
            res.json({ message: 'Unesite naziv sporta' });
        }
        else {
            UserModel.findOne({ kor_ime: adminKorIme, tip: 'administrator', status: 'aktivan' }).then(administrator => {
                if (!administrator) {
                    res.json({ message: 'Nemate pravo pristupa' });
                }
                else {
                    SportModel.findOne({ naziv: naziv }).then(postojeci => {
                        if (postojeci) {
                            res.json({ message: 'Sport vec postoji' });
                        }
                        else {
                            new SportModel({ naziv: naziv }).save().then(() => {
                                res.json({ message: 'OK' });
                            }).catch(err => {
                                console.log(err);
                                res.json({ message: 'Greska pri dodavanju sporta' });
                            });
                        }
                    }).catch(err => {
                        console.log(err);
                        res.json({ message: 'Greska pri proveri sporta' });
                    });
                }
            }).catch(err => {
                console.log(err);
                res.json({ message: 'Greska pri proveri administratora' });
            });
        }
    };
}

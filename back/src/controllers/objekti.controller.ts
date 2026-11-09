import * as express from 'express';
import SportskiObjekatModel from '../models/sportskiObjekat';
import PromocijaModel from '../models/promocija';
import TerminModel from '../models/termin';
import KaznaModel from '../models/kazna';
import OpremaModel from '../models/oprema';
import NarudzbinaModel from '../models/narudzbina';
import OglasModel from '../models/oglas';
import TrenerModel from '../models/trener';
import OcenaModel from '../models/ocena';
import SportModel from '../models/sport';
import PDFDocument from 'pdfkit';

function sadrzi(tekst: string, trazeno: string) {
    return tekst.toLowerCase().includes(trazeno.toLowerCase());
}

function posaljiPdf(res: express.Response, nazivFajla: string, lines: string[]) {
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${nazivFajla}`);
        res.send(Buffer.concat(chunks));
    });
    doc.on('error', err => {
        console.log(err);
        if (!res.headersSent) {
            res.status(500).end();
        }
    });

    for (let line of lines) {
        doc.text(line);
    }

    doc.end();
}

function vremeKraja(d: Date, sati: number) {
    const kraj = new Date(d);
    kraj.setHours(kraj.getHours() + sati);
    return kraj;
}

function vremeUDatumu(datum: string, sat: string) {
    const d = new Date(`${datum}T${sat}:00`);
    d.setSeconds(0, 0);
    return d;
}

function vremeUMinute(vreme: string) {
    const delovi = (vreme || '00:00').split(':').map(Number);
    return Number(delovi[0] || 0) * 60 + Number(delovi[1] || 0);
}

function preklapaSe(aPocetak: Date, aKraj: Date, bPocetak: Date, bKraj: Date) {
    if (aPocetak < bKraj && aKraj > bPocetak)
        return true;
    return false;
}

function podaciZaposlenog(body: any) {
    return body.zaposleni || body;
}

function izvuciMesec(mesec: string) {
    const delovi = (mesec || '').split('-');
    const godina = Number(delovi[0]);
    const redniMesec = Number(delovi[1]);

    if (
        delovi.length != 2 ||
        delovi[0].length != 4 ||
        delovi[1].length != 2 ||
        !Number.isInteger(godina) ||
        !Number.isInteger(redniMesec) ||
        String(godina) != delovi[0] ||
        String(redniMesec).padStart(2, '0') != delovi[1] ||
        redniMesec < 1 ||
        redniMesec > 12
    ) {
        return null;
    }

    const od = new Date(godina, redniMesec - 1, 1);
    const doo = new Date(godina, redniMesec, 1);

    return { od: od, do: doo };
}

function validirajObjekat(o: any) {
    if (!o.naziv || !o.grad || !o.adresa) return 'Unesite naziv, grad i adresu objekta';

    if (!Array.isArray(o.tereni) || o.tereni.length == 0) {
        return 'Objekat mora imati bar jedan teren/halu/dvoranu';
    }

    const nazivi: string[] = [];
    let imaOtvorenTeren = false;

    for (let t of o.tereni) {
        if (!t.naziv || !t.sport || !t.tip || !t.vrsta) {
            return 'Unesite sve podatke za elemente objekta';
        }

        if (nazivi.includes(t.naziv)) {
            return 'Nazivi terena/hala/dvorana moraju biti jedinstveni';
        }

        nazivi.push(t.naziv);

        if ((t.opisOpreme || '').length > 300) {
            return 'Opis opreme sme imati najvise 300 karaktera';
        }

        const kapacitet = Number(t.kapacitet || 0);

        if (t.tip == 'otvoreni' && t.vrsta == 'teren' && kapacitet >= 4) {
            imaOtvorenTeren = true;
        }
    }

    if (!imaOtvorenTeren) {
        return 'Objekat mora imati najmanje jedan otvoreni teren sa bar 4 mesta';
    }

    return '';
}

function pripremiObjekat(o: any, zaposleni: any) {
    const tereni = (o.tereni || []).map((t: any) => {
        const kapacitet = Number(t.kapacitet || 0);

        return {
            naziv: t.naziv,
            sport: t.sport,
            tip: t.tip,
            vrsta: t.vrsta,
            kapacitet: kapacitet,
            opisOpreme: t.opisOpreme || ''
        };
    });

    const sportovi: string[] = [];
    const tipoviTerena: string[] = [];

    for (let t of tereni) {
        if (t.sport && !sportovi.includes(t.sport)) sportovi.push(t.sport);
        if (t.tip && !tipoviTerena.includes(t.tip)) tipoviTerena.push(t.tip);
    }

    return {
        id: o.id || `id${Date.now()}`,
        firmaId: zaposleni.firmaId,
        naziv: o.naziv,
        grad: o.grad,
        adresa: o.adresa,
        aktivan: o.aktivan !== false,
        lajkovi: Number(o.lajkovi || 0),
        dislajkovi: Number(o.dislajkovi || 0),
        sportovi: sportovi,
        tipoviTerena: tipoviTerena,
        cenaRezervacijePoSatu: Number(o.cenaRezervacijePoSatu || 0),
        radnoVremeOd: o.radnoVremeOd || '08:00',
        radnoVremeDo: o.radnoVremeDo || '22:00',
        dozvoljeniNedolasci: Number(o.dozvoljeniNedolasci || 3),
        tereni: tereni,
        galerijaSlika: o.galerijaSlika || []
    };
}

export class ObjektiController {

    detaljiDohvatiObjekat = (req: express.Request, res: express.Response) => {
        let id = req.params.id;

        SportskiObjekatModel.findOne({ id: id, aktivan: true }).then(objekat => {
            res.json(objekat);
        }).catch(err => {
            console.log(err);
            res.json(null);
        });
    }

    dohvatiZauzeteTermineObjekta = (req: express.Request, res: express.Response) => {
        const objekatId = req.body.objekatId;
        const kor_ime = req.body.kor_ime || '';

        if (kor_ime) {
            TerminModel.find({
                objekatId: objekatId,
                $or: [
                    { status: 'prihvacen' },
                    { status: 'na cekanju', kor_ime: kor_ime }
                ]
            }).sort({ pocetak: 1 }).then(termini => {
                res.json(termini);
            }).catch(err => {
                console.log(err);
                res.json([]);
            });
        }
        else {
            TerminModel.find({
                objekatId: objekatId,
                status: { $in: ['prihvacen', 'potvrdjeno'] }
            }).sort({ pocetak: 1 }).then(termini => {
                res.json(termini);
            }).catch(err => {
                console.log(err);
                res.json([]);
            });
        }
    };

    dohvatiTrenere = (req: express.Request, res: express.Response) => {
        const objekatId = req.body.objekatId;
        const sport = req.body.sport;
        const samoAktivni = req.body.samoAktivni !== false;
        const filter: any = {};

        if (objekatId != '') filter.objekatId = objekatId;
        if (sport != '') filter.sport = sport;
        if (samoAktivni) filter.status = 'aktivan';

        TrenerModel.find(filter).then(treneri => {
            res.json(treneri);
        }).catch(err => {
            console.log(err);
            res.json([]);
        });
    }

    dohvatiSvuOpremu = (req: express.Request, res: express.Response) => {
        OpremaModel.find({}).sort({ naziv: 1 }).then(oprema => {
            res.json(oprema);
        }).catch(err => {
            console.log(err);
            res.json([]);
        });
    }

    narudzbineSportiste = (req: express.Request, res: express.Response) => {
        const kor_ime = req.body.kor_ime;

        NarudzbinaModel.find({ kor_ime: kor_ime }).sort({ datumNarucivanja: -1 }).then(narudzbine => {
            res.json(narudzbine);
        }).catch(err => {
            console.log(err);
            res.json([]);
        });
    }

    otkaziNarudzbinuSportista = (req: express.Request, res: express.Response) => {
        NarudzbinaModel.findOneAndUpdate(
            {
                id: req.body.id,
                kor_ime: req.body.kor_ime,
                status: 'naruceno',
                zaliheVracene: { $ne: true }
            },
            {
                $set: { status: 'otkazano', zaliheVracene: true }
            },
            { new: false }
        ).then(narudzbina => {
            if (!narudzbina) {
                res.json({ message: 'Narudzbina nije pronadjena ili vise ne moze da se otkaze' });
                return;
            }

            const vracanjeZaliha = narudzbina.stavke.map(stavka => {
                return {
                    updateOne: {
                        filter: {
                            id: String(stavka.opremaId || ''),
                            firmaId: String(narudzbina.firmaId || '')
                        },
                        update: { $inc: { zalihe: Number(stavka.kolicina || 0) } }
                    }
                };
            });

            OpremaModel.bulkWrite(vracanjeZaliha).then(result => {
                if ((result as any).matchedCount != vracanjeZaliha.length) {
                    res.json({ message: 'Nije moguce vratiti zalihe za svu opremu iz narudzbine' });
                }
                else {
                    res.json({ message: 'OK' });
                }
            }).catch(err => {
                console.log(err);

                NarudzbinaModel.updateOne(
                    {
                        _id: narudzbina._id,
                        status: 'otkazano',
                        zaliheVracene: true
                    },
                    {
                        $set: { status: narudzbina.status, zaliheVracene: false }
                    }
                ).then(() => {
                    res.json({ message: 'Greska pri vracanju zaliha' });
                }).catch(errVracanjeStatusa => {
                    console.log(errVracanjeStatusa);
                    res.json({ message: 'Greska pri otkazivanju narudzbine' });
                });
            });
        }).catch(err => {
            console.log(err);
            res.json({ message: 'Greska pri otkazivanju narudzbine' });
        });
    }

    dohvatiObjekteZaposlenog = (req: express.Request, res: express.Response) => {
        const idFirme = req.body.firmaId;

        SportskiObjekatModel.find({ firmaId: idFirme }).then(objekti => {
            res.json(objekti);
        }).catch(err => {
            console.log(err);
            res.json([]);
        });
    }

    terminiZaposlenog = (req: express.Request, res: express.Response) => {
        const idFirme = req.body.firmaId;

        SportskiObjekatModel.find({ firmaId: idFirme }).then(objekti => {
            const ids = (objekti as any[]).map(o => o.id);

            TerminModel.find({ objekatId: { $in: ids } }).sort({ pocetak: 1 }).then(termini => {
                res.json(termini);
            }).catch(err => {
                console.log(err);
                res.json([]);
            });
        }).catch(err => {
            console.log(err);
            res.json([]);
        });
    }

    sacuvajObjekat = (req: express.Request, res: express.Response) => {
        const zaposleni = req.body.zaposleni || req.body;
        const objekat = req.body.objekat || req.body;
        let greska = '';

        if (!zaposleni || !zaposleni.firmaId) {
            greska = 'Zaposleni nije povezan sa firmom';
        }
        else if (!objekat.naziv || !objekat.grad || !objekat.adresa) {
            greska = 'Unesite naziv, grad i adresu objekta';
        }
        else if (Number(objekat.cenaRezervacijePoSatu) <= 0) {
            greska = 'Cena rezervacije mora biti veca od nule';
        }
        else if (!Number.isInteger(Number(objekat.dozvoljeniNedolasci)) || Number(objekat.dozvoljeniNedolasci) < 0) {
            greska = 'Broj dozvoljenih nedolazaka mora biti ceo broj nula ili veci';
        }
        else if (!Array.isArray(objekat.tereni) || objekat.tereni.length < 2) {
            greska = 'Objekat mora imati najmanje dva elementa';
        }
        else {
            const nazivi: string[] = [];
            let imaOtvorenTeren = false;

            for (let t of objekat.tereni) {
                const naziv = String(t.naziv || '').trim().toLowerCase();
                const sport = String(t.sport || '').trim();
                const kapacitet = Number(t.kapacitet);

                if (!naziv || !sport || !t.tip || !t.vrsta) {
                    greska = 'Unesite sve podatke za elemente objekta';
                    break;
                }

                if (t.tip != 'otvoreni' && t.tip != 'zatvoreni') {
                    greska = 'Tip elementa nije ispravan';
                    break;
                }

                if (t.vrsta != 'teren' && t.vrsta != 'hala' && t.vrsta != 'dvorana') {
                    greska = 'Vrsta elementa nije ispravna';
                    break;
                }

                if (nazivi.includes(naziv)) {
                    greska = 'Nazivi elemenata u objektu moraju biti jedinstveni';
                    break;
                }

                if (!Number.isInteger(kapacitet) || kapacitet < 1) {
                    greska = 'Kapacitet svakog elementa mora biti ceo broj veci od nule';
                    break;
                }

                if (String(t.opisOpreme || '').length > 300) {
                    greska = 'Opis opreme sme imati najvise 300 karaktera';
                    break;
                }

                nazivi.push(naziv);

                if (t.tip == 'otvoreni' && t.vrsta == 'teren' && kapacitet >= 4) {
                    imaOtvorenTeren = true;
                }
            }

            if (!greska && !imaOtvorenTeren) {
                greska = 'Objekat mora imati najmanje jedan otvoreni teren sa bar 4 mesta';
            }
        }

        if (greska) {
            res.json({ message: greska });
        }
        else {
            const trazeniSportovi: string[] = [];

            for (let t of objekat.tereni) {
                const sport = String(t.sport || '').trim();

                if (!trazeniSportovi.includes(sport)) {
                    trazeniSportovi.push(sport);
                }
            }

            SportModel.find({ naziv: { $in: trazeniSportovi } }).then(dozvoljeniSportovi => {
                if (dozvoljeniSportovi.length != trazeniSportovi.length) {
                    res.json({ message: 'Svi sportovi moraju biti iz dozvoljene liste' });
                }
                else {
                    SportskiObjekatModel.find({}).then(postojeciObjekti => {
                        let najveciBrojObjekta = 0;

                        for (let postojeci of postojeciObjekti) {
                            const tekstId = String(postojeci.id || '');
                            const broj = Number(tekstId.substring(2));

                            if (Number.isInteger(broj) && broj > najveciBrojObjekta) {
                                najveciBrojObjekta = broj;
                            }
                        }

                        const postojeciObjekat = postojeciObjekti.find(o => o.id == objekat.id);

                        if (postojeciObjekat && postojeciObjekat.firmaId != zaposleni.firmaId) {
                            res.json({ message: 'Nemate pravo da menjate ovaj objekat' });
                        }
                        else {
                            let dupliGlobalniNaziv = '';

                            for (let t of objekat.tereni) {
                                const tiip = t.tip == 'zatvoreni' || t.vrsta == 'hala' || t.vrsta == 'dvorana';

                                if (!tiip) continue;

                                const naziv = t.naziv.trim().toLowerCase();

                                for (let drugiObjekat of postojeciObjekti) {
                                    if (drugiObjekat.id == objekat.id) continue;

                                    for (let drugiTeren of drugiObjekat.tereni || []) {
                                        const drugiJeGlobalni = drugiTeren.tip == 'zatvoreni' ||
                                            drugiTeren.vrsta == 'hala' || drugiTeren.vrsta == 'dvorana';

                                        if (drugiJeGlobalni && String(drugiTeren.naziv || '').trim().toLowerCase() == naziv) {
                                            dupliGlobalniNaziv = String(t.naziv);
                                            break;
                                        }
                                    }

                                    if (dupliGlobalniNaziv) break;
                                }

                                if (dupliGlobalniNaziv) break;
                            }

                            if (dupliGlobalniNaziv) {
                                res.json({
                                    message: `Naziv zatvorenog terena, hale ili dvorane "${dupliGlobalniNaziv}" vec postoji u drugom objektu`
                                });
                            }
                            else {
                                const tereni: any[] = [];
                                const sportovi: string[] = [];
                                const tipoviTerena: string[] = [];

                                for (let t of objekat.tereni) {
                                    const sredjenTeren = {
                                        naziv: String(t.naziv).trim(),
                                        sport: String(t.sport).trim(),
                                        tip: t.tip,
                                        vrsta: t.vrsta,
                                        kapacitet: Number(t.kapacitet),
                                        opisOpreme: String(t.opisOpreme || '').trim()
                                    };

                                    tereni.push(sredjenTeren);

                                    if (!sportovi.includes(sredjenTeren.sport)) {
                                        sportovi.push(sredjenTeren.sport);
                                    }

                                    if (!tipoviTerena.includes(sredjenTeren.tip)) {
                                        tipoviTerena.push(sredjenTeren.tip);
                                    }
                                }

                                const id = objekat.id || `id${najveciBrojObjekta + 1}`;
                                let aktivan = false;
                                let status = 'na cekanju';
                                let uneo = String(zaposleni.kor_ime || '');

                                if (postojeciObjekat) {
                                    if (postojeciObjekat.status == 'aktivan' || (!postojeciObjekat.status && postojeciObjekat.aktivan === true)) {
                                        aktivan = true;
                                        status = 'aktivan';
                                    }

                                    if (postojeciObjekat.uneo) {
                                        uneo = postojeciObjekat.uneo;
                                    }
                                }

                                const sacuvan = {
                                    id: id,
                                    firmaId: zaposleni.firmaId,
                                    naziv: String(objekat.naziv).trim(),
                                    grad: String(objekat.grad).trim(),
                                    adresa: String(objekat.adresa).trim(),
                                    aktivan: aktivan,
                                    status: status,
                                    uneo: uneo,
                                    lajkovi: Number(objekat.lajkovi || 0),
                                    dislajkovi: Number(objekat.dislajkovi || 0),
                                    sportovi: sportovi,
                                    tipoviTerena: tipoviTerena,
                                    cenaRezervacijePoSatu: Number(objekat.cenaRezervacijePoSatu),
                                    radnoVremeOd: objekat.radnoVremeOd,
                                    radnoVremeDo: objekat.radnoVremeDo,
                                    dozvoljeniNedolasci: Number(objekat.dozvoljeniNedolasci),
                                    tereni: tereni,
                                    galerijaSlika: Array.isArray(objekat.galerijaSlika) ? objekat.galerijaSlika : []
                                };

                                SportskiObjekatModel.updateOne(
                                    { id: id },
                                    { $set: sacuvan },
                                    { upsert: true }
                                ).then(() => {
                                    res.json({ message: 'OK' });
                                }).catch(err => {
                                    console.log(err);
                                    res.json({ message: 'Greska pri cuvanju objekta' });
                                });
                            }
                        }
                    }).catch(err => {
                        console.log(err);
                        res.json({ message: 'Greska pri proveri objekata' });
                    });
                }
            }).catch(err => {
                console.log(err);
                res.json({ message: 'Greska pri proveri sportova' });
            });
        }
    }

    importObjekata = (req: express.Request, res: express.Response) => {
        const zaposleni = req.body.zaposleni;
        let podaci = req.body.objekti;

        if (podaci && podaci.objekti) {
            podaci = podaci.objekti;
        }

        if (!zaposleni || !zaposleni.firmaId) {
            res.json({ message: 'Zaposleni nije povezan sa firmom' });
        }
        else if (!podaci) {
            res.json({ message: 'JSON ne sadrzi objekte' });
        }
        else {
            const objekti = Array.isArray(podaci) ? podaci : [podaci];

            if (objekti.length == 0) {
                res.json({ message: 'JSON ne sadrzi objekte' });
            }
            else {
                const trazeniSportovi: string[] = [];

                for (let o of objekti) {
                    if (o && Array.isArray(o.tereni)) {
                        for (let t of o.tereni) {
                            const sport = String(t.sport || '').trim();

                            if (sport && !trazeniSportovi.includes(sport)) {
                                trazeniSportovi.push(sport);
                            }
                        }
                    }
                }

                SportModel.find({ naziv: { $in: trazeniSportovi } }).then(dozvoljeniSportovi => {
                    if (dozvoljeniSportovi.length != trazeniSportovi.length) {
                        res.json({ message: 'Svi sportovi moraju biti iz dozvoljene liste' });
                    }
                    else {
                        SportskiObjekatModel.find({}).then(postojeciObjekti => {
                            const globalniNazivi: string[] = [];
                            let najveciBrojObjekta = 0;

                            for (let postojeci of postojeciObjekti) {
                                const tekstId = String(postojeci.id || '');
                                const broj = Number(tekstId.substring(2));

                                if (Number.isInteger(broj) && broj > najveciBrojObjekta) {
                                    najveciBrojObjekta = broj;
                                }

                                for (let t of postojeci.tereni || []) {
                                    if (t.tip == 'zatvoreni' || t.vrsta == 'hala' || t.vrsta == 'dvorana' ) {
                                        const naziv = String(t.naziv || '').trim().toLowerCase();

                                        if (naziv && !globalniNazivi.includes(naziv)) {
                                            globalniNazivi.push(naziv);
                                        }
                                    }
                                }
                            }

                            const operacije: any[] = [];
                            let greska = '';

                            for (let i = 0; i < objekti.length; i++) {
                                const o = objekti[i];
                                const prefiks = `Objekat ${i + 1}: `;

                                if (!o || !o.naziv || !o.grad || !o.adresa) {
                                    greska = prefiks + 'unesite naziv, grad i adresu objekta';
                                    break;
                                }

                                if (Number(o.cenaRezervacijePoSatu) <= 0) {
                                    greska = prefiks + 'cena rezervacije mora biti veca od nule';
                                    break;
                                }

                                if (o.radnoVremeOd >= o.radnoVremeDo) {
                                    greska = prefiks + 'radno vreme objekta nije ispravno';
                                    break;
                                }

                                if (!Number.isInteger(Number(o.dozvoljeniNedolasci)) || Number(o.dozvoljeniNedolasci) < 0) {
                                    greska = prefiks + 'broj dozvoljenih nedolazaka mora biti ceo broj nula ili veci';
                                    break;
                                }

                                if (!Array.isArray(o.tereni) || o.tereni.length < 2) {
                                    greska = prefiks + 'objekat mora imati najmanje dva elementa';
                                    break;
                                }

                                const naziviObjekta: string[] = [];
                                const noviGlobalniNazivi: string[] = [];
                                const tereni: any[] = [];
                                const sportovi: string[] = [];
                                const tipoviTerena: string[] = [];
                                let imaOtvorenTeren = false;

                                for (let t of o.tereni) {
                                    const naziv = String(t.naziv || '').trim().toLowerCase();
                                    const sport = String(t.sport || '').trim();
                                    const kapacitet = Number(t.kapacitet);

                                    if (!naziv || !sport || !t.tip || !t.vrsta) {
                                        greska = prefiks + 'unesite sve podatke za elemente objekta';
                                        break;
                                    }

                                    if (t.tip != 'otvoreni' && t.tip != 'zatvoreni') {
                                        greska = prefiks + 'tip elementa nije ispravan';
                                        break;
                                    }

                                    if (t.vrsta != 'teren' && t.vrsta != 'hala' && t.vrsta != 'dvorana') {
                                        greska = prefiks + 'vrsta elementa nije ispravna';
                                        break;
                                    }

                                    if (naziviObjekta.includes(naziv)) {
                                        greska = prefiks + 'nazivi elemenata u objektu moraju biti jedinstveni';
                                        break;
                                    }

                                    if (!Number.isInteger(kapacitet) || kapacitet < 1) {
                                        greska = prefiks + 'kapacitet svakog elementa mora biti ceo broj veci od nule';
                                        break;
                                    }

                                    if (String(t.opisOpreme || '').length > 300) {
                                        greska = prefiks + 'opis opreme sme imati najvise 300 karaktera';
                                        break;
                                    }

                                    const tiip = t.tip == 'zatvoreni' || t.vrsta == 'hala' || t.vrsta == 'dvorana';

                                    if (tiip && (globalniNazivi.includes(naziv) || noviGlobalniNazivi.includes(naziv))) {
                                        greska = prefiks + `naziv zatvorenog terena, hale ili dvorane "${String(t.naziv).trim()}" vec postoji`;
                                        break;
                                    }

                                    naziviObjekta.push(naziv);

                                    if (tiip) {
                                        noviGlobalniNazivi.push(naziv);
                                    }

                                    if (t.tip == 'otvoreni' && t.vrsta == 'teren' && kapacitet >= 4) {
                                        imaOtvorenTeren = true;
                                    }

                                    const sredjenTeren = {
                                        naziv: String(t.naziv).trim(),
                                        sport: sport,
                                        tip: t.tip,
                                        vrsta: t.vrsta,
                                        kapacitet: kapacitet,
                                        opisOpreme: String(t.opisOpreme || '').trim()
                                    };

                                    tereni.push(sredjenTeren);

                                    if (!sportovi.includes(sport)) {
                                        sportovi.push(sport);
                                    }

                                    if (!tipoviTerena.includes(t.tip)) {
                                        tipoviTerena.push(t.tip);
                                    }
                                }

                                if (greska) break;

                                if (!imaOtvorenTeren) {
                                    greska = prefiks + 'objekat mora imati najmanje jedan otvoreni teren sa bar 4 mesta';
                                    break;
                                }

                                for (let naziv of noviGlobalniNazivi) {
                                    globalniNazivi.push(naziv);
                                }

                                const objekatZaUpis = {
                                    id: `id${najveciBrojObjekta + i + 1}`,
                                    firmaId: zaposleni.firmaId,
                                    naziv: String(o.naziv).trim(),
                                    grad: String(o.grad).trim(),
                                    adresa: String(o.adresa).trim(),
                                    aktivan: false,
                                    status: 'na cekanju',
                                    uneo: String(zaposleni.kor_ime || ''),
                                    lajkovi: 0,
                                    dislajkovi: 0,
                                    sportovi: sportovi,
                                    tipoviTerena: tipoviTerena,
                                    cenaRezervacijePoSatu: Number(o.cenaRezervacijePoSatu),
                                    radnoVremeOd: o.radnoVremeOd,
                                    radnoVremeDo: o.radnoVremeDo,
                                    dozvoljeniNedolasci: Number(o.dozvoljeniNedolasci),
                                    tereni: tereni,
                                    galerijaSlika: Array.isArray(o.galerijaSlika) ? o.galerijaSlika : []
                                };

                                operacije.push({
                                    insertOne: {
                                        document: objekatZaUpis
                                    }
                                });
                            }

                            if (greska) {
                                res.json({ message: greska });
                            }
                            else {
                                SportskiObjekatModel.bulkWrite(operacije).then(() => {
                                    res.json({ message: 'OK' });
                                }).catch(err => {
                                    console.log(err);
                                    res.json({ message: 'Greska pri importu objekata' });
                                });
                            }
                        }).catch(err => {
                            console.log(err);
                            res.json({ message: 'Greska pri proveri postojecih objekata' });
                        });
                    }
                }).catch(err => {
                    console.log(err);
                    res.json({ message: 'Greska pri proveri sportova' });
                });
            }
        }
    };

    opremaZaZaposlenog = (req: express.Request, res: express.Response) => {
        const firmaId = String(req.body.firmaId || '').trim();

        if (!firmaId) {
            res.json([]);
        }
        else {
            OpremaModel.find({ firmaId: firmaId }).sort({ naziv: 1 }).then(oprema => {
                res.json(oprema);
            }).catch(err => {
                console.log(err);
                res.json([]);
            });
        }
    }

    prihvatiTermin = (req: express.Request, res: express.Response) => {
        const id = req.body.id;
        const firmaId = req.body.firmaId;

        if (!id || !firmaId) {
            res.json({ message: 'Nedostaju podaci o terminu ili zaposlenom' });
        }
        else {
            TerminModel.findOne({ id: id, status: 'na cekanju' }).then(termin => {
                if (!termin) {
                    res.json({ message: 'Termin nije pronadjen' });
                }
                else {
                    const pocetak = new Date((termin as any).pocetak);

                    if (Number.isNaN(pocetak.getTime()) || pocetak <= new Date()) {
                        res.json({ message: 'Nije moguce prihvatiti termin koji je vec poceo ili prosao' });
                    }
                    else {
                        SportskiObjekatModel.findOne({
                            id: (termin as any).objekatId,
                            firmaId: firmaId
                        }).then(objekat => {
                            if (!objekat) {
                                res.json({ message: 'Termin ne pripada objektu vase firme' });
                            }
                            else {
                                TerminModel.findOne({
                                    id: { $ne: id },
                                    objekatId: (termin as any).objekatId,
                                    terenNaziv: (termin as any).terenNaziv,
                                    status: 'prihvacen',
                                    pocetak: { $lt: (termin as any).kraj },
                                    kraj: { $gt: (termin as any).pocetak }
                                }).then(zauzet => {
                                    if (zauzet) {
                                        res.json({ message: 'Vec postoji prihvacen termin u tom periodu' });
                                    }
                                    else {
                                        TerminModel.updateOne(
                                            {
                                                id: id,
                                                status: 'na cekanju',
                                                pocetak: { $gt: new Date() }
                                            },
                                            {
                                                $set: {
                                                    status: 'prihvacen',
                                                    prisustvo: ''
                                                }
                                            }
                                        ).then(result => {
                                            if ((result as any).modifiedCount == 0) {
                                                res.json({ message: 'Termin vise ne moze da se prihvati' });
                                            }
                                            else {
                                                res.json({ message: 'OK' });
                                            }
                                        }).catch(err => {
                                            console.log(err);
                                            res.json({ message: 'Greska pri prihvatanju termina' });
                                        });
                                    }
                                }).catch(err => {
                                    console.log(err);
                                    res.json({ message: 'Greska pri proveri termina' });
                                });
                            }
                        }).catch(err => {
                            console.log(err);
                            res.json({ message: 'Greska pri proveri objekta' });
                        });
                    }
                }
            }).catch(err => {
                console.log(err);
                res.json({ message: 'Greska pri prihvatanju termina' });
            });
        }}


    otkaziTerminZaposleni = (req: express.Request, res: express.Response) => {
        TerminModel.updateOne(
            { id: req.body.id, status: 'na cekanju' },
            { $set: { status: 'odbijen', prisustvo: '' } }
        ).then(result => {
            if ((result as any).modifiedCount == 0) {
                res.json({ message: 'Termin nije pronadjen' });
            }
            else {
                res.json({ message: 'OK' });
            }
        }).catch(err => {
            console.log(err);
            res.json({ message: 'Greska pri otkazivanju termina' });
        });
    }

    dosaoNaTermin = (req: express.Request, res: express.Response) => {
        const id = req.body.id;
        const firmaId = req.body.firmaId;
        const sada = new Date();
        const preDesetMinuta = new Date(sada.getTime() - 10 * 60 * 1000);

        if (!id || !firmaId) {
            res.json({ message: 'Nedostaju podaci o terminu ili zaposlenom' });
        }
        else {
            TerminModel.findOne({
                id: id,
                status: 'prihvacen',
                prisustvo: { $in: ['', null] },
                pocetak: { $gte: preDesetMinuta, $lte: sada }
            }).then(termin => {
                if (!termin) {
                    res.json({ message: 'Dolazak se moze evidentirati samo do 10 minuta po pocetku termina' });
                }
                else {
                    SportskiObjekatModel.findOne({
                        id: (termin as any).objekatId,
                        firmaId: firmaId
                    }).then(objekat => {
                        if (!objekat) {
                            res.json({ message: 'Termin ne pripada objektu vase firme' });
                        }
                        else {
                            TerminModel.updateOne(
                                {
                                    id: id,
                                    status: 'prihvacen',
                                    prisustvo: { $in: ['', null] },
                                    pocetak: { $gte: preDesetMinuta, $lte: sada }
                                },
                                { $set: { prisustvo: 'dosao' } }
                            ).then(result => {
                                if ((result as any).modifiedCount == 0) {
                                    res.json({ message: 'Prisustvo je vec evidentirano ili je vreme isteklo' });
                                }
                                else {
                                    res.json({ message: 'OK' });
                                }
                            }).catch(err => {
                                console.log(err);
                                res.json({ message: 'Greska pri potvrdi termina' });
                            });
                        }}).catch(err => {
                        console.log(err);
                        res.json({ message: 'Greska pri proveri objekta' });
                    });
                }
            }).catch(err => {
                console.log(err);
                res.json({ message: 'Greska pri potvrdi termina' });
            });
        }
    }

    nijeDosaoNaTermin = (req: express.Request, res: express.Response) => {
        const id = req.body.id;
        const firmaId = req.body.firmaId;
        const sada = new Date();
        const preDesetMinuta = new Date(sada.getTime() - 10 * 60 * 1000);

        if (!id || !firmaId) {
            res.json({ message: 'Nedostaju podaci o terminu ili zaposlenom' });
        }
        else {
            TerminModel.findOne({
                id: id,
                status: 'prihvacen',
                prisustvo: { $in: ['', null] },
                pocetak: { $gte: preDesetMinuta, $lte: sada }
            }).then(termin => {
                if (!termin) {
                    res.json({ message: 'Nedolazak se moze evidentirati samo do 10 minuta po pocetku termina' });
                }
                else {
                    SportskiObjekatModel.findOne({
                        id: (termin as any).objekatId,
                        firmaId: firmaId
                    }).then(objekat => {
                        if (!objekat) {
                            res.json({ message: 'Termin ne pripada objektu vase firme' });
                        }
                        else {
                            TerminModel.updateOne(
                                {
                                    id: id,
                                    status: 'prihvacen',
                                    prisustvo: { $in: ['', null] },
                                    pocetak: { $gte: preDesetMinuta, $lte: sada }
                                },
                                { $set: { prisustvo: 'nijedosao' } }
                            ).then(result => {
                                if ((result as any).modifiedCount == 0) {
                                    res.json({ message: 'Prisustvo je vec evidentirano ili je vreme isteklo' });
                                }
                                else {
                                    const vrednostLimita = (objekat as any).dozvoljeniNedolasci;
                                    const brojLimita = Number(vrednostLimita);
                                    const limit = vrednostLimita === undefined || vrednostLimita === null ||
                                        !Number.isFinite(brojLimita) || brojLimita < 0 ? 3 : brojLimita;

                                    KaznaModel.findOneAndUpdate(
                                        {
                                            objekatId: (termin as any).objekatId,
                                            kor_ime: (termin as any).kor_ime
                                        },
                                        {
                                            $inc: { nedolasci: 1 },
                                            $setOnInsert: { blokiran: false }
                                        },
                                        {
                                            upsert: true,
                                            new: true
                                        }
                                    ).then(kazna => {
                                        if (!kazna) {
                                            res.json({ message: 'Greska pri upisu nedolaska' });
                                        }
                                        else {
                                            const nedolasci = Number((kazna as any).nedolasci || 0);
                                            const blokiran = Boolean((kazna as any).blokiran) || nedolasci >= limit;

                                            if (!blokiran) {
                                                res.json({
                                                    message: 'OK',
                                                    blokiran: false
                                                });
                                            }
                                            else {
                                                KaznaModel.updateOne(
                                                    {
                                                        objekatId: (termin as any).objekatId,
                                                        kor_ime: (termin as any).kor_ime
                                                    },
                                                    { $set: { blokiran: true } }
                                                ).then(() => {
                                                    res.json({
                                                        message: 'OK',
                                                        blokiran: true
                                                    });
                                                }).catch(err => {
                                                    console.log(err);
                                                    res.json({ message: 'Greska pri odjavi termina' });
                                                });
                                            }
                                        }
                                    }).catch(err => {
                                        console.log(err);
                                        res.json({ message: 'Greska pri odjavi termina' });
                                    });
                                }
                            }).catch(err => {
                                console.log(err);
                                res.json({ message: 'Greska pri odjavi termina' });
                            });
                        }
                    }).catch(err => {
                        console.log(err);
                        res.json({ message: 'Greska pri proveri objekta' });
                    });
                }
            }).catch(err => {
                console.log(err);
                res.json({ message: 'Greska pri odjavi termina' });
            });
        }
    };

    sacuvajPromociju = (req: express.Request, res: express.Response) => {
        const p = req.body.promocija;
        const firmaId = String(req.body.firmaId || '').trim();
        const naziv = p.naziv.trim();
        const sport = p.sport.trim();
        const tipPopusta = p.tipPopusta;
        const popust = Number(p.popust);
        const vaziOd = new Date(p.vaziOd);
        const vaziDo = new Date(p.vaziDo);

        if (
            !firmaId ||
            !p.objekatId ||
            !naziv ||
            !sport ||
            !['procenat', 'fiksni'].includes(tipPopusta) ||
            !Number.isFinite(popust) ||
            popust <= 0 ||
            Number.isNaN(vaziOd.getTime()) ||
            Number.isNaN(vaziDo.getTime())
        ) {
            res.json({ message: 'Podaci promocije nisu ispravni' });
        }
        else if (vaziDo < vaziOd) {
            res.json({ message: 'Datum zavrsetka nije ispravan' });
        }
        else if (tipPopusta == 'procenat' && popust > 100) {
            res.json({ message: 'Procentualni popust ne moze biti veci od 100' });
        }
        else {
            SportModel.findOne({ naziv: sport }).then(dozvoljenSport => {
                if (!dozvoljenSport) {
                    res.json({ message: 'Sport nije u dozvoljenoj listi' });
                }
                else {
                    SportskiObjekatModel.find({ firmaId: firmaId }).then(objekti => {
                        const ids = (objekti as any[]).map(objekat => objekat.id);
                        const objekat = (objekti as any[]).find(objekatFirme => objekatFirme.id == p.objekatId);

                        if (!objekat) {
                            res.json({ message: 'Izabrani objekat ne pripada vasoj firmi' });
                        }
                        else {
                            const podaci = {
                                naziv: naziv,
                                objekatId: p.objekatId,
                                objekatNaziv: objekat.naziv,
                                vaziOd: vaziOd,
                                vaziDo: vaziDo,
                                tipPopusta: tipPopusta,
                                popust: popust,
                                sport: sport
                            };

                            if (p._id) {
                                PromocijaModel.updateOne(
                                    {
                                        _id: p._id,
                                        objekatId: { $in: ids }
                                    },
                                    { $set: podaci }
                                ).then(result => {
                                    if ((result as any).matchedCount == 0) {
                                        res.json({ message: 'Promocija nije pronadjena ili ne pripada vasoj firmi' });
                                    }
                                    else {
                                        res.json({ message: 'OK' });
                                    }
                                }).catch(err => {
                                    console.log(err);
                                    res.json({ message: 'Greska pri azuriranju promocije' });
                                });
                            }
                            else {
                                new PromocijaModel({
                                    id: `id${Date.now()}`,
                                    naziv: podaci.naziv,
                                    objekatId: podaci.objekatId,
                                    objekatNaziv: podaci.objekatNaziv,
                                    vaziOd: podaci.vaziOd,
                                    vaziDo: podaci.vaziDo,
                                    tipPopusta: podaci.tipPopusta,
                                    popust: podaci.popust,
                                    sport: podaci.sport
                                }).save().then(() => {
                                    res.json({ message: 'OK' });
                                }).catch(err => {
                                    console.log(err);
                                    res.json({ message: 'Greska pri dodavanju promocije' });
                                });
                            }
                        }
                    }).catch(err => {
                        console.log(err);
                        res.json({ message: 'Greska pri proveri objekta promocije' });
                    });
                }
            }).catch(err => {
                console.log(err);
                res.json({ message: 'Greska pri proveri sporta' });
            });
        }
    }

    sacuvajOpremu = (req: express.Request, res: express.Response) => {
        const o = req.body.oprema;
        const id = o.id.trim();
        const firmaId = req.body.firmaId.trim();
        const naziv = o.naziv.trim();
        const sport = o.sport.trim();
        const slika = o.slika;
        const cena = Number(o.cena);
        const zalihe = Number(o.zalihe);

        if (!firmaId) {
            res.json({ message: 'Zaposleni nije povezan sa firmom' });
        }
        else if (!naziv || !sport) {
            res.json({ message: 'Unesite naziv i sport opreme' });
        }
        else if (!Number.isFinite(cena) || cena <= 0) {
            res.json({ message: 'Cena opreme mora biti veca od nule' });
        }
        else if (!Number.isInteger(zalihe) || zalihe < 0) {
            res.json({ message: 'Zalihe moraju biti ceo broj nula ili veci' });
        }
        else if (!slika.startsWith('data:image/')) {
            res.json({ message: 'Slika opreme nije ispravna' });
        }
        else {
            SportModel.findOne({ naziv: sport }).then(dozvoljenSport => {
                if (!dozvoljenSport) {
                    res.json({ message: 'Sport nije u dozvoljenoj listi' });
                }
                else {
                    const podaci = {
                        firmaId: firmaId,
                        objekatId: '',
                        naziv: naziv,
                        cena: cena,
                        zalihe: zalihe,
                        sport: sport,
                        slika: slika
                    };

                    if (id) {
                        OpremaModel.updateOne(
                            {
                                id: id,
                                firmaId: firmaId
                            },
                            { $set: podaci }
                        ).then(result => {
                            if ((result as any).matchedCount == 0) {
                                res.json({ message: 'Oprema nije pronadjena ili ne pripada vasoj firmi' });
                            }
                            else {
                                res.json({ message: 'OK' });
                            }
                        }).catch(err => {
                            console.log(err);
                            res.json({ message: 'Greska pri azuriranju opreme' });
                        });
                    }
                    else {
                        new OpremaModel({
                            id: `id${Date.now()}_${Math.floor(Math.random() * 1000000000)}`,
                            firmaId: podaci.firmaId,
                            objekatId: podaci.objekatId,
                            naziv: podaci.naziv,
                            cena: podaci.cena,
                            zalihe: podaci.zalihe,
                            sport: podaci.sport,
                            slika: podaci.slika
                        }).save().then(() => {
                            res.json({ message: 'OK' });
                        }).catch(err => {
                            console.log(err);
                            res.json({ message: 'Greska pri dodavanju opreme' });
                        });
                    }
                }
            }).catch(err => {
                console.log(err);
                res.json({ message: 'Greska pri proveri sporta' });
            });
        }
    }

    promeniStatusNarudzbine = (req: express.Request, res: express.Response) => {
        const status = req.body.status;
        const id = req.body.id;
        const firmaId = String(req.body.firmaId || '').trim();

        if (!id || !firmaId || !['prihvaceno', 'preuzeto', 'otkazano'].includes(status)) {
            res.json({ message: 'Neispravan status narudzbine' });
        }
        else {
            NarudzbinaModel.findOne({
                id: id,
                firmaId: firmaId
            }).then(narudzbina => {
                if (!narudzbina) {
                    res.json({ message: 'Narudzbina nije pronadjena ili ne pripada vasoj firmi' });
                }
                else if (status == 'prihvaceno') {
                    if (narudzbina.status != 'naruceno') {
                        res.json({ message: 'Samo narucena narudzbina moze da se prihvati' });
                    }
                    else {
                        NarudzbinaModel.updateOne(
                            {
                                _id: narudzbina._id,
                                status: 'naruceno'
                            },
                            { $set: { status: 'prihvaceno' } }
                        ).then(result => {
                            if ((result as any).modifiedCount == 0) {
                                res.json({ message: 'Status narudzbine je u medjuvremenu promenjen' });
                            }
                            else {
                                res.json({ message: 'OK' });
                            }
                        }).catch(err => {
                            console.log(err);
                            res.json({ message: 'Greska pri prihvatanju narudzbine' });
                        });
                    }
                }
                else if (status == 'preuzeto') {
                    if (narudzbina.status != 'prihvaceno') {
                        res.json({ message: 'Samo prihvacena narudzbina moze da se oznaci kao preuzeta' });
                    }
                    else {
                        NarudzbinaModel.updateOne(
                            {
                                _id: narudzbina._id,
                                status: 'prihvaceno'
                            },
                            {
                                $set: {
                                    status: 'preuzeto',
                                    datumPreuzimanja: new Date()
                                }
                            }
                        ).then(result => {
                            if ((result as any).modifiedCount == 0) {
                                res.json({ message: 'Status narudzbine je u medjuvremenu promenjen' });
                            }
                            else {
                                res.json({ message: 'OK' });
                            }
                        }).catch(err => {
                            console.log(err);
                            res.json({ message: 'Greska pri preuzimanju narudzbine' });
                        });
                    }
                }
                else if (
                    !['naruceno', 'prihvaceno'].includes(String(narudzbina.status)) ||
                    narudzbina.zaliheVracene == true
                ) {
                    res.json({ message: 'Narudzbina vise ne moze da se otkaze' });
                }
                else {
                    NarudzbinaModel.findOneAndUpdate(
                        {
                            _id: narudzbina._id,
                            status: { $in: ['naruceno', 'prihvaceno'] },
                            zaliheVracene: { $ne: true }
                        },
                        {
                            $set: {
                                status: 'otkazano',
                                zaliheVracene: true
                            }
                        },
                        { new: false }
                    ).then(otkazanaNarudzbina => {
                        if (!otkazanaNarudzbina) {
                            res.json({ message: 'Status narudzbine je u medjuvremenu promenjen' });
                        }
                        else {
                            const vracanjeZaliha = otkazanaNarudzbina.stavke.map(stavka => {
                                return {
                                    updateOne: {
                                        filter: {
                                            id: String(stavka.opremaId || ''),
                                            firmaId: firmaId
                                        },
                                        update: { $inc: { zalihe: Number(stavka.kolicina || 0) } }
                                    }
                                };
                            });

                            OpremaModel.bulkWrite(vracanjeZaliha).then(result => {
                                if ((result as any).matchedCount != vracanjeZaliha.length) {
                                    res.json({ message: 'Nije moguce vratiti zalihe za svu opremu iz narudzbine' });
                                }
                                else {
                                    res.json({ message: 'OK' });
                                }
                            }).catch(err => {
                                console.log(err);

                                NarudzbinaModel.updateOne(
                                    {
                                        _id: otkazanaNarudzbina._id,
                                        status: 'otkazano',
                                        zaliheVracene: true
                                    },
                                    {
                                        $set: {
                                            status: otkazanaNarudzbina.status,
                                            zaliheVracene: false
                                        }
                                    }
                                ).then(() => {
                                    res.json({ message: 'Greska pri vracanju zaliha' });
                                }).catch(errVracanjeStatusa => {
                                    console.log(errVracanjeStatusa);
                                    res.json({ message: 'Greska pri promeni statusa narudzbine' });
                                });
                            });
                        }
                    }).catch(err => {
                        console.log(err);
                        res.json({ message: 'Greska pri otkazivanju narudzbine' });
                    });
                }
            }).catch(err => {
                console.log(err);
                res.json({ message: 'Greska pri promeni statusa narudzbine' });
            });
        }
    }

    promeniTermin = (req: express.Request, res: express.Response) => {
        const id = String(req.body.id || '').trim();
        const firmaId = String(req.body.firmaId || '').trim();
        const pocetak = new Date(req.body.pocetak);
        const kraj = new Date(req.body.kraj);

        if (!id || !firmaId || Number.isNaN(pocetak.getTime()) || Number.isNaN(kraj.getTime())) {
            res.json({ message: 'Podaci za pomeranje termina nisu ispravni' });
        }
        else if (kraj <= pocetak) {
            res.json({ message: 'Kraj termina mora biti posle pocetka' });
        }
        else if (pocetak <= new Date()) {
            res.json({ message: 'Termin se ne moze pomeriti u proslost' });
        }
        else if (pocetak.getFullYear() != kraj.getFullYear() || pocetak.getMonth() != kraj.getMonth() ||
            pocetak.getDate() != kraj.getDate()) {
            res.json({ message: 'Termin mora poceti i zavrsiti se istog dana' });
        }
        else {
            TerminModel.findOne({ id: id, status: 'prihvacen' }).then(termin => {
                if (!termin) {
                    res.json({ message: 'Prihvacen termin nije pronadjen' });
                }
                else {
                    const tipGrupe = termin.tip == 'trening' ? 'trening' : 'rezervacija';
                    const filterGrupe: any = {
                        objekatId: termin.objekatId,
                        terenNaziv: termin.terenNaziv,
                        kor_ime: termin.kor_ime,
                        sport: termin.sport,
                        status: 'prihvacen'
                    };

                    if (tipGrupe == 'trening') {
                        filterGrupe.tip = 'trening';
                    }
                    else {
                        filterGrupe.$or = [
                            { tip: 'rezervacija' },
                            { tip: '' },
                            { tip: { $exists: false } }
                        ];
                    }

                    TerminModel.find(filterGrupe).sort({ pocetak: 1 }).then(srodniTermini => {
                        const indeksSidra = srodniTermini.findIndex(t => String(t._id) == String(termin._id));

                        if (indeksSidra == -1) {
                            res.json({ message: 'Termin nije pronadjen u grupi' });
                        }
                        else {
                            const datumSidra = new Date(termin.pocetak!);
                            let pocetniIndeks = indeksSidra;
                            let krajnjiIndeks = indeksSidra;

                            while (pocetniIndeks > 0) {
                                const prethodni = srodniTermini[pocetniIndeks - 1];
                                const prvi = srodniTermini[pocetniIndeks];
                                const prethodniPocetak = new Date(prethodni.pocetak!);
                                const prethodniKraj = new Date(prethodni.kraj!);
                                const prviPocetak = new Date(prvi.pocetak!);
                                const istiDan = prethodniPocetak.getFullYear() == datumSidra.getFullYear() &&
                                    prethodniPocetak.getMonth() == datumSidra.getMonth() &&
                                    prethodniPocetak.getDate() == datumSidra.getDate();
                                const istiTrener = tipGrupe != 'trening' ||
                                    String(prethodni.trenerId || '') == String(termin.trenerId || '');

                                if (!Number.isNaN(prethodniKraj.getTime()) && !Number.isNaN(prviPocetak.getTime()) &&
                                    prethodniKraj.getTime() == prviPocetak.getTime() && istiDan && istiTrener) {
                                    pocetniIndeks--;
                                }
                                else {
                                    break;
                                }
                            }

                            while (krajnjiIndeks < srodniTermini.length - 1) {
                                const poslednji = srodniTermini[krajnjiIndeks];
                                const sledeci = srodniTermini[krajnjiIndeks + 1];
                                const poslednjiKraj = new Date(poslednji.kraj!);
                                const sledeciPocetak = new Date(sledeci.pocetak!);
                                const istiDan = sledeciPocetak.getFullYear() == datumSidra.getFullYear() &&
                                    sledeciPocetak.getMonth() == datumSidra.getMonth() &&
                                    sledeciPocetak.getDate() == datumSidra.getDate();
                                const istiTrener = tipGrupe != 'trening' ||
                                    String(sledeci.trenerId || '') == String(termin.trenerId || '');

                                if (!Number.isNaN(poslednjiKraj.getTime()) && !Number.isNaN(sledeciPocetak.getTime()) &&
                                    poslednjiKraj.getTime() == sledeciPocetak.getTime() && istiDan && istiTrener) {
                                    krajnjiIndeks++;
                                }
                                else {
                                    break;
                                }
                            }

                            const grupa = srodniTermini.slice(pocetniIndeks, krajnjiIndeks + 1);
                            const stariPocetak = new Date(grupa[0].pocetak!);
                            const stariKraj = new Date(grupa[grupa.length - 1].kraj!);
                            const staroTrajanje = stariKraj.getTime() - stariPocetak.getTime();
                            const novoTrajanje = kraj.getTime() - pocetak.getTime();
                            const neispravanClan = grupa.some(t => {
                                const pocetakClana = new Date(t.pocetak!);
                                const krajClana = new Date(t.kraj!);

                                return (Number.isNaN(pocetakClana.getTime()) || Number.isNaN(krajClana.getTime()) ||
                                    krajClana <= pocetakClana);
                            });
                            const zapocetClan = grupa.some(t => new Date(t.pocetak!) <= new Date());

                            if (neispravanClan || Number.isNaN(stariPocetak.getTime()) ||
                                Number.isNaN(stariKraj.getTime()) || staroTrajanje <= 0) {
                                res.json({ message: 'Postojeci termini nemaju ispravno trajanje' });
                            }
                            else if (zapocetClan) {
                                res.json({ message: 'Termin koji je vec poceo ne moze se pomeriti' });
                            }
                            else if (novoTrajanje != staroTrajanje) {
                                res.json({ message: 'Pomeranjem se ne sme menjati trajanje termina' });
                            }
                            else {
                                SportskiObjekatModel.findOne({ id: termin.objekatId, firmaId: firmaId }).then(objekat => {
                                    if (!objekat) {
                                        res.json({ message: 'Objekat nije pronadjen ili ne pripada vasoj firmi' });
                                    }
                                    else {
                                        const teren = objekat.tereni.find(t => t.naziv == termin.terenNaziv);

                                        if (!teren) {
                                            res.json({ message: 'Teren termina nije pronadjen' });
                                        }
                                        else if (String(teren.tip || '').trim().toLowerCase() == 'otvoreni') {
                                            res.json({ message: 'Termin se moze pomerati samo na zatvorenom terenu, u hali ili dvorani' });
                                        }
                                        else {
                                            const radnoOdDelovi = String(objekat.radnoVremeOd || '').split(':').map(Number);
                                            const radnoDoDelovi = String(objekat.radnoVremeDo || '').split(':').map(Number);
                                            const radnoOd = Number(radnoOdDelovi[0]) * 60 + Number(radnoOdDelovi[1]);
                                            const radnoDo = Number(radnoDoDelovi[0]) * 60 + Number(radnoDoDelovi[1]);
                                            const noviPocetakMinuti = pocetak.getHours() * 60 + pocetak.getMinutes();
                                            const noviKrajMinuti = kraj.getHours() * 60 + kraj.getMinutes();

                                            if (radnoOdDelovi.length != 2 || radnoDoDelovi.length != 2 ||
                                                !Number.isFinite(radnoOd) || !Number.isFinite(radnoDo) || radnoDo <= radnoOd) {
                                                res.json({ message: 'Radno vreme objekta nije ispravno' });
                                            }
                                            else if (noviPocetakMinuti < radnoOd || noviKrajMinuti > radnoDo) {
                                                res.json({ message: 'Novi termin mora biti unutar radnog vremena objekta' });
                                            }
                                            else {
                                                const idsGrupe = grupa.map(t => t._id);
                                                const usloviZauzetosti: any[] = [
                                                    { objekatId: termin.objekatId, terenNaziv: termin.terenNaziv }
                                                ];

                                                if (termin.kor_ime) {
                                                    usloviZauzetosti.push({ kor_ime: termin.kor_ime });
                                                }

                                                if (tipGrupe == 'trening' && termin.trenerId) {
                                                    usloviZauzetosti.push({ trenerId: termin.trenerId });
                                                }

                                                TerminModel.findOne({
                                                    _id: { $nin: idsGrupe },
                                                    status: 'prihvacen',
                                                    pocetak: { $lt: kraj },
                                                    kraj: { $gt: pocetak },
                                                    $or: usloviZauzetosti
                                                }).then(zauzet => {
                                                    if (zauzet) {
                                                        res.json({
                                                            message: 'Novi termin se preklapa sa zauzecem terena, vas korisnika ili nekog trenera'
                                                        });
                                                    }
                                                    else {
                                                        const pomeraj = pocetak.getTime() - stariPocetak.getTime();
                                                        const pomereniClanovi = grupa.map(t => {
                                                            const stariPocetakClana = new Date(t.pocetak!);
                                                            const stariKrajClana = new Date(t.kraj!);

                                                            return {
                                                                id: t._id,
                                                                stariPocetak: stariPocetakClana,
                                                                stariKraj: stariKrajClana,
                                                                noviPocetak: new Date(stariPocetakClana.getTime() + pomeraj),
                                                                noviKraj: new Date(stariKrajClana.getTime() + pomeraj)
                                                            };
                                                        });
                                                        const operacije = pomereniClanovi.map(t => ({
                                                            updateOne: {
                                                                filter: {
                                                                    _id: t.id,
                                                                    status: 'prihvacen',
                                                                    pocetak: t.stariPocetak,
                                                                    kraj: t.stariKraj
                                                                },
                                                                update: {
                                                                    $set: {
                                                                        pocetak: t.noviPocetak,
                                                                        kraj: t.noviKraj
                                                                    }
                                                                }
                                                            }
                                                        }));
                                                        const operacijeVracanja = pomereniClanovi.map(t => ({
                                                            updateOne: {
                                                                filter: {
                                                                    _id: t.id,
                                                                    status: 'prihvacen',
                                                                    pocetak: t.noviPocetak,
                                                                    kraj: t.noviKraj
                                                                },
                                                                update: {
                                                                    $set: {
                                                                        pocetak: t.stariPocetak,
                                                                        kraj: t.stariKraj
                                                                    }
                                                                }
                                                            }
                                                        }));

                                                        TerminModel.bulkWrite(operacije).then(result => {
                                                            if ((result as any).matchedCount != grupa.length) {
                                                                TerminModel.bulkWrite(operacijeVracanja).then(() => {
                                                                    res.json({ message: 'Neki od spojenih termina su u medjuvremenu promenjeni' });
                                                                }).catch(err => {
                                                                    console.log(err);
                                                                    res.json({ message: 'Greska pri vracanju spojenih termina' });
                                                                });
                                                            }
                                                            else {
                                                                res.json({ message: 'OK' });
                                                            }
                                                        }).catch(err => {
                                                            console.log(err);
                                                            TerminModel.bulkWrite(operacijeVracanja).then(() => {
                                                                res.json({ message: 'Greska pri pomeranju termina' });
                                                            }).catch(errVracanja => {
                                                                console.log(errVracanja);
                                                                res.json({ message: 'Greska pri pomeranju i vracanju spojenih termina' });
                                                            });
                                                        });
                                                    }
                                                }).catch(err => {
                                                    console.log(err);
                                                    res.json({ message: 'Greska pri proveri zauzetosti' });
                                                });
                                            }
                                        }
                                    }
                                }).catch(err => {
                                    console.log(err);
                                    res.json({ message: 'Greska pri proveri objekta' });
                                });
                            }
                        }
                    }).catch(err => {
                        console.log(err);
                        res.json({ message: 'Greska pri pronalasku spojenih termina' });
                    });
                }
            }).catch(err => {
                console.log(err);
                res.json({ message: 'Greska pri pronalasku termina' });
            });
        }
    };
    izvestajPopunjenost = (req: express.Request, res: express.Response) => {
        const firmaId = String(req.params.firmaId || '');
        const objekatId = String(req.params.objekatId);
        const mesec = String(req.params.mesec);
        const period = izvuciMesec(mesec);

        if (!firmaId || !objekatId || !period) {
            res.status(400).send('Podaci za izvestaj nisu ispravni');
        }
        else {
            SportskiObjekatModel.findOne({ id: objekatId, firmaId: firmaId }).then(objekat => {
                if (!objekat) {
                    res.status(404).send('Objekat nije pronadjen ili ne pripada vasoj firmi');
                }
                else {
                    const radnoOd = vremeUMinute(String(objekat.radnoVremeOd || ''));
                    const radnoDo = vremeUMinute(String(objekat.radnoVremeDo || ''));

                    if (radnoDo <= radnoOd) {
                        res.status(400).send('Radno vreme objekta nije ispravno');
                    }
                    else {
                        TerminModel.find({
                            objekatId: objekatId,
                            status: 'prihvacen',
                            pocetak: { $lt: period.do },
                            kraj: { $gt: period.od }
                        }).then(termini => {
                            const brojDana = new Date(period.do.getFullYear(), period.do.getMonth(), 0).getDate();
                            const minutiDnevno = radnoDo - radnoOd;
                            const raspoloziviMinuti = brojDana * minutiDnevno;
                            const raspoloziviSati = raspoloziviMinuti / 60;
                            const lines = [
                                'Mesecni izvestaj o popunjenosti',
                                `Objekat: ${objekat.naziv}`,
                                `Mesec: ${mesec}`,
                                `Radno vreme: ${objekat.radnoVremeOd} - ${objekat.radnoVremeDo}`,
                                `Broj dana u mesecu: ${brojDana}`,
                                'Formula: zauzeti minuti / raspolozivi minuti x 100',
                                ''
                            ];

                            for (let teren of objekat.tereni) {
                                let zauzetiMinuti = 0;
                                let brojTermina = 0;

                                for (let termin of termini) {
                                    if (termin.terenNaziv == teren.naziv) {
                                        let pocetak = new Date(termin.pocetak!);
                                        let kraj = new Date(termin.kraj!);

                                        if (pocetak < period.od) {
                                            pocetak = new Date(period.od);
                                        }

                                        if (kraj > period.do) {
                                            kraj = new Date(period.do);
                                        }

                                        if (kraj > pocetak) {
                                            zauzetiMinuti += (kraj.getTime() - pocetak.getTime()) / (60 * 1000);
                                            brojTermina++;
                                        }
                                    }
                                }

                                let procenat = zauzetiMinuti / raspoloziviMinuti * 100;
                                const zauzetiSati = zauzetiMinuti / 60;

                                lines.push(`${teren.naziv} (${teren.tip})`);
                                lines.push(`  Broj termina: ${brojTermina}`);
                                lines.push(`  Zauzeto: ${zauzetiSati.toFixed(2)} od ${raspoloziviSati.toFixed(2)} sati`);
                                lines.push(`  Popunjenost: ${procenat.toFixed(2)}%`);
                                lines.push('');
                            }

                            posaljiPdf(res, 'popunjenost.pdf', lines);
                        }).catch(err => {
                            console.log(err);
                            res.status(500).send('Greska pri dohvatanju termina');
                        });
                    }
                }
            }).catch(err => {
                console.log(err);
                res.status(500).send('Greska pri dohvatanju objekta');
            });
        }
    }

    izvestajOprema = (req: express.Request, res: express.Response) => {
        const firmaId = String(req.params.firmaId || '');
        const mesec = String(req.params.mesec);
        const period = izvuciMesec(mesec);

        if (!firmaId || !period) {
            res.status(400).send('Podaci za izvestaj nisu ispravni');
        }
        else {
            NarudzbinaModel.find({
                firmaId: firmaId,
                status: 'preuzeto',
                datumPreuzimanja: {
                    $gte: period.od,
                    $lt: period.do
                }
            }).then(narudzbine => {
                let ukupanPromet = 0;
                let ukupnoKomada = 0;
                const pregled: any[] = [];

                for (let narudzbina of narudzbine) {
                    for (let stavka of narudzbina.stavke) {
                        const kolicina = Number(stavka.kolicina || 0);
                        let iznos = Number(stavka.ukupno || 0);

                        if (iznos == 0) {
                            iznos = Number(stavka.cena || 0) * kolicina;
                        }
                        let pronadjenaStavka: any = null;

                        ukupanPromet += iznos;
                        ukupnoKomada += kolicina;

                        for (let p of pregled) {
                            if (p.opremaId == stavka.opremaId) {
                                pronadjenaStavka = p;
                            }
                        }

                        if (pronadjenaStavka) {
                            pronadjenaStavka.kolicina += kolicina;
                            pronadjenaStavka.promet += iznos;
                        }
                        else {
                            pregled.push({
                                opremaId: stavka.opremaId,
                                naziv: stavka.opremaNaziv,
                                kolicina: kolicina,
                                promet: iznos
                            });
                        }
                    }
                }

                const lines = [
                    'Mesecni izvestaj o prometu opreme',
                    `Firma: ${firmaId}`,
                    `Mesec: ${mesec}`,
                    'Racunaju se samo preuzete narudzbine.',
                    `Broj narudzbina: ${narudzbine.length}`,
                    `Ukupno komada: ${ukupnoKomada}`,
                    `Ukupan promet: ${ukupanPromet.toFixed(2)} RSD`,
                    ''
                ];

                if (pregled.length == 0) {
                    lines.push('Nema preuzete opreme u izabranom mesecu.');
                }
                else {
                    lines.push('Promet po artiklu:');

                    for (let p of pregled) {
                        lines.push(`${p.naziv}: ${p.kolicina} kom, ${p.promet.toFixed(2)} RSD`);
                    }
                }

                posaljiPdf(res, 'promet-opreme.pdf', lines);
            }).catch(err => {
                console.log(err);
                res.status(500).send('Greska pri dohvatanju narudzbina');
            });
        }
    }

    promocijeZaZaposlenog = (req: express.Request, res: express.Response) => {
        const idF = req.body.firmaId;

        SportskiObjekatModel.find({ firmaId: idF }).then(objekti => {
            const ids = (objekti as any[]).map(o => o.id);
            PromocijaModel.find({ objekatId: { $in: ids } }).sort({ vaziOd: -1 }).then(promocije => {
                res.json(promocije);
            }).catch(err => {
                console.log(err);
                res.json([]);
            });
        }).catch(err => {
            console.log(err);
            res.json([]);
        });
    }

    narudzbineZaZaposlenog = (req: express.Request, res: express.Response) => {
        const firmaId = String(req.body.firmaId || '').trim();

        if (!firmaId) {
            res.json([]);
        }
        else {
            NarudzbinaModel.find({
                firmaId: firmaId
            }).sort({ datumNarucivanja: -1 }).then(narudzbine => {
                res.json(narudzbine);
            }).catch(err => {
                console.log(err);
                res.json([]);
            });
        }
    }

    dohvatPodatkePocetna = (req: express.Request, res: express.Response) => {
        SportskiObjekatModel.find({ aktivan: true }).then(objekti => {
            const gradovi: string[] = [];

            for (let o of objekti) {
                if (o.grad && !gradovi.includes(o.grad)) gradovi.push(o.grad);
            }

            const objektiSort = objekti.sort((a, b) => (b.lajkovi || 0) - (a.lajkovi || 0));

            const topObjekti = objektiSort.slice(0, 3);
            const danas = new Date();
            const idsAktivnihObjekata = objekti.map(objekat => objekat.id);

            SportModel.find({}).sort({ naziv: 1 }).then(sportovi => {
                PromocijaModel.find({
                    objekatId: { $in: idsAktivnihObjekata },
                    vaziOd: { $lte: danas },
                    vaziDo: { $gte: danas }
                }).then(promocije => {
                    res.json({
                        ukupnoAktivnih: objekti.length,
                        topObjekti: topObjekti,
                        promocije: promocije,
                        gradovi: gradovi,
                        sportovi: sportovi.map(sport => sport.naziv),
                        sviObjekti: objekti
                    });
                }).catch(err => {
                    console.log(err);
                    res.json({ message: 'Greska' });
                });
            }).catch(err => {
                console.log(err);
                res.json({ message: 'Greska' });
            });
        }).catch(err => {
            console.log(err);
            res.json({ message: 'Greska' });
        });
    }

    pretraga = (req: express.Request, res: express.Response) => {
        const naziv = req.body.naziv;
        const gradovi = req.body.izabraniGradovi || req.body.gradovi || [];
        const sport = req.body.izabranSport || req.body.sport;
        const tipTerena = req.body.tipTerena;

        SportskiObjekatModel.find({ aktivan: true }).then(objekti => {
            let rezultat = (objekti as any[]).filter(o => {
                if (naziv && !sadrzi(o.naziv || '', naziv)) return false;
                if (gradovi.length > 0 && !gradovi.includes(o.grad)) return false;

                if (sport) {
                    let imaSport = false;

                    if (o.sportovi.includes(sport)) {
                        imaSport = true;
                    }

                    for (let teren of o.tereni) {
                        if (teren.sport == sport) {
                            imaSport = true;
                        }
                    }

                    if (!imaSport) {
                        return false;
                    }
                }

                if (tipTerena) {
                    let imaTip = false;

                    if (o.tipoviTerena.includes(tipTerena)) {
                        imaTip = true;
                    }

                    for (let teren of o.tereni) {
                        if (teren.tip == tipTerena) {
                            imaTip = true;
                            break;
                        }
                    }

                    if (!imaTip) {
                        return false;
                    }
                }

                return true;
            });

            res.json(rezultat);
        }).catch(err => {
            console.log(err);
            res.json([]);
        });
    }

    dohvatiRezervacijeSportiste = (req: express.Request, res: express.Response) => {
        let kor_ime = req.body.kor_ime
        TerminModel.find({ kor_ime: kor_ime }).sort({ pocetak: -1 }).then(termini => {
            res.json(termini);
        }).catch(err => {
            console.log(err);
            res.json({ message: 'Greska pri dohvatanju termina' });
        });
    }





    otkaziTerminSportista = (req: express.Request, res: express.Response) => {
        const id = req.body.id;
        const kor_ime = req.body.kor_ime;

        TerminModel.findOne({ id: id, kor_ime: kor_ime }).then(termin => {
            if (!termin) {
                res.json({ message: 'Nema termina' });
            }
            else if (termin.status == 'otkazan' || termin.status == 'odbijen') {
                res.json({ message: 'Termin je vec otkaan' });
            }
            else {
                const pocetak = new Date(termin.pocetak!).getTime();

                if (termin.status != 'na cekanju' && pocetak - Date.now() < 12 * 60 * 60 * 1000) {
                    res.json({ message: 'Termin mozete otkazati do 12 sati ranije' });
                }
                else {
                    TerminModel.updateOne({ id: id, kor_ime: kor_ime }, { $set: { status: 'otkazan' } }).then(() => {
                        res.json({ message: 'OK' });
                    }).catch(err => {
                        console.log(err);
                        res.json({ message: 'Greska pri otkazivanju termina' });
                    });
                }
            }
        }).catch(err => {
            console.log(err);
            res.json({ message: 'Greska pri otkazivanju termina' });
        });
    }

    pretragaObjekataSportista = (req: express.Request, res: express.Response) => {
        const naziv = req.body.naziv;
        const gradovi = req.body.gradovi;
        const sport = req.body.sport;
        const tipTerena = req.body.tipTerena;
        const samoSlobodniDanas = req.body.samoSlobodniDanas;

        SportskiObjekatModel.find({ aktivan: true }).then(objekti => {
            let rezultat = objekti.filter(o => {
                if (naziv && !sadrzi(o.naziv || '', naziv)) return false;
                if (gradovi.length > 0 && !gradovi.includes(o.grad)) return false;

                if (sport) {
                    let imaSport = false;
                    for (let teren of o.tereni || []) {
                        if (teren.sport == sport) imaSport = true;
                    }
                    if (!imaSport) return false;
                }

                if (tipTerena) {
                    let imaTip = false;
                    for (let teren of o.tereni || []) {
                        if (teren.tip == tipTerena) imaTip = true;
                    }
                    if (!imaTip) return false;
                }

                return true;
            });

            if (!samoSlobodniDanas) {
                res.json(rezultat);
            }
            else {
                const idoNiz = rezultat.map(o => o.id);
                let pocetakDana = new Date();
                pocetakDana.setHours(0, 0, 0, 0);
                let krajDana = new Date(pocetakDana);
                krajDana.setDate(krajDana.getDate() + 1);

                TerminModel.find({
                    objekatId: { $in: idoNiz },
                    status: 'prihvacen',
                    pocetak: { $lt: krajDana },
                    kraj: { $gt: pocetakDana }
                }).then(termini => {
                    const slobodni = rezultat.filter(o => {
                        for (let teren of o.tereni) {

                            if (sport && teren.sport != sport) continue;
                            if (tipTerena && teren.tip != tipTerena) continue;

                            const od = Number((o.radnoVremeOd!).substring(0, 2));
                            const doo = Number((o.radnoVremeDo!).substring(0, 2));

                            for (let h = od; h < doo; h++) {
                                const pocetak = new Date(pocetakDana);
                                pocetak.setHours(h, 0, 0, 0);
                                const kraj = vremeKraja(pocetak, 1);

                                let zauzet = false;

                                for (let t of termini) {
                                    if (t.objekatId == o.id && t.terenNaziv == teren.naziv && t.pocetak && t.kraj &&
                                        preklapaSe(pocetak, kraj, t.pocetak, t.kraj)) {
                                        zauzet = true;
                                        break;
                                    }
                                }

                                if (!zauzet) return true;
                            }
                        }

                        return false;
                    });

                    res.json(slobodni);
                }).catch(err => {
                    console.log(err);
                    res.json([]);
                });
            }
        }).catch(err => {
            console.log(err);
            res.json([]);
        });
    }

    rezervisiTermin = (req: express.Request, res: express.Response) => {
        const kor_ime = req.body.kor_ime;
        const objekatId = req.body.objekatId;
        const terenNaziv = req.body.terenNaziv;
        const datum = req.body.datum;
        const sat = req.body.sat;
        const trajanje = Number(req.body.trajanje || 1);

        if (!kor_ime || !objekatId || !terenNaziv || !datum || !sat || trajanje < 1) {
            res.json({ message: 'Unesite sve podatke za termin' });
        }
        else {
            const pocetak = vremeUDatumu(datum, sat);
            const kraj = vremeKraja(pocetak, trajanje);

            if (pocetak <= new Date()) {
                res.json({ message: 'Greska pri rezervaciji: nije moguce rezervisanje u proslosti' });
            }
            else {
                KaznaModel.findOne({ objekatId: objekatId, kor_ime: kor_ime, blokiran: true }).then(kazna => {
                    if (kazna) {
                        res.json({ message: 'Blokirani ste za ovaj objekat' });
                    }
                    else {
                        SportskiObjekatModel.findOne({ id: objekatId, aktivan: true }).then(objekat => {
                            if (!objekat) {
                                res.json({ message: 'Objekat nije pronadjen' });
                            }
                            else {
                                const tereni = objekat.tereni || [];
                                const teren = tereni.find((t: any) => t.naziv == terenNaziv);

                                if (!teren) {
                                    res.json({ message: 'Greska' });
                                }
                                else {
                                    const pocetakMin = pocetak.getHours() * 60 + pocetak.getMinutes();
                                    const krajMin = kraj.getHours() * 60 + kraj.getMinutes();
                                    const radnoOd = vremeUMinute(objekat.radnoVremeOd!);
                                    const radnoDo = vremeUMinute(objekat.radnoVremeDo!);

                                    if (pocetakMin < radnoOd || krajMin > radnoDo) {
                                        res.json({ message: 'Termin je van radnog vremena objekta' });
                                    }
                                    else {
                                        TerminModel.findOne({
                                            objekatId: objekatId,
                                            terenNaziv: terenNaziv,
                                            pocetak: { $lt: kraj },
                                            kraj: { $gt: pocetak },
                                            status: 'prihvacen'
                                        }).then(zauzet => {
                                            if (zauzet) {
                                                res.json({ message: 'Termin nije slobodan' });
                                            }
                                            else {
                                                const noviTermin = new TerminModel({
                                                    id: `id${Date.now()}`,
                                                    objekatId: objekatId,
                                                    objekatNaziv: objekat.naziv,
                                                    terenNaziv: terenNaziv,
                                                    grad: objekat.grad,
                                                    sport: teren.sport,
                                                    kor_ime: kor_ime,
                                                    tip: 'rezervacija',
                                                    pocetak: pocetak,
                                                    kraj: kraj,
                                                    status: 'na cekanju',
                                                    prisustvo: '',
                                                    trenerId: ''
                                                });

                                                noviTermin.save().then(() => {
                                                    res.json({ message: 'OK' });
                                                }).catch(err => {
                                                    console.log(err);
                                                    res.json({ message: 'Greska' });
                                                });
                                            }
                                        }).catch(err => {
                                            console.log(err);
                                            res.json({ message: 'Greska' });
                                        });
                                    }
                                }
                            }
                        }).catch(err => {
                            console.log(err);
                            res.json({ message: 'Greska' });
                        });
                    }
                }).catch(err => {
                    console.log(err);
                    res.json({ message: 'Greska pri proveri kazne' });
                });
            }
        }
    };

    objaviOglas = (req: express.Request, res: express.Response) => {
        const oglas = req.body;

        if (!oglas.autor || !oglas.sport || !oglas.grad || !oglas.datum ||
            !oglas.terminOd || !oglas.terminDo || Number(oglas.brojIgraca) < 1) {
            res.json({ message: 'Unesite sve podatke za oglas' });
        }
        else {
            const sport = String(oglas.sport).trim();

            SportModel.findOne({ naziv: sport }).then(dozvoljenSport => {
                if (!dozvoljenSport) {
                    res.json({ message: 'Sport nije u dozvoljenoj listi' });
                }
                else {
                    new OglasModel({
                        id: `id${Date.now()}`,
                        autor: oglas.autor,
                        sport: sport,
                        grad: oglas.grad,
                        datum: oglas.datum,
                        terminOd: oglas.terminOd,
                        terminDo: oglas.terminDo,
                        brojIgraca: Number(oglas.brojIgraca),
                        status: 'aktivan',
                        zahtevi: [],
                        datumKreiranja: new Date()
                    }).save().then(() => {
                        res.json({ message: 'OK' });
                    }).catch(err => {
                        console.log(err);
                        res.json({ message: 'Greska pri cuvanju oglasa' });
                    });
                }
            }).catch(err => {
                console.log(err);
                res.json({ message: 'Greska pri proveri sporta' });
            });
        }
    };

    posaljiZahtevOglas = (req: express.Request, res: express.Response) => {
        const id = req.body.id;
        const kor_ime = req.body.kor_ime;

        OglasModel.findOne({ id: id, status: 'aktivan' }).then(oglas => {
            if (!oglas) {
                res.json({ message: 'Oglas nije pronadjen' });
            }
            else if (oglas.autor == kor_ime) {
                res.json({ message: 'Ne mozete se prijaviti na svoj oglas' });
            }
            else if (oglas.zahtevi.some((z: any) => z.kor_ime == kor_ime)) {
                res.json({ message: 'Zahtev je vec poslat' });
            }
            else {
                oglas.zahtevi.push({ kor_ime: kor_ime, status: 'na cekanju' });

                oglas.save().then(() => {
                    res.json({ message: 'OK' });
                }).catch(err => {
                    console.log(err);
                    res.json({ message: 'Greska' });
                });
            }
        }).catch(err => {
            console.log(err);
            res.json({ message: 'Greska' });
        });
    }

    updateZahtevOglas = (req: express.Request, res: express.Response) => {
        const id = req.body.id;
        const kor_ime = req.body.kor_ime;
        const sportista = req.body.sportista;
        const status = req.body.status;

        OglasModel.findOne({ id: id, autor: sportista }).then(oglas => {
            if (!oglas) {
                res.json({ message: 'Oglas nije pronadjen' });
            }
            else {
                const zahtev = oglas.zahtevi.find((z: any) => z.kor_ime == kor_ime);

                if (!zahtev) {
                    res.json({ message: 'Zahtev nije pronadjen' });
                }
                else {
                    zahtev.status = status;

                    const prihvaceni = oglas.zahtevi.filter((z: any) => z.status == 'prihvacen').length;

                    if (prihvaceni >= Number(oglas.brojIgraca)) {
                        oglas.status = 'zatvoren';
                    }

                    oglas.save().then(() => {
                        res.json({ message: 'OK' });
                    }).catch(err => {
                        console.log(err);
                        res.json({ message: 'Greska' });
                    });
                }
            }
        }).catch(err => {
            console.log(err);
            res.json({ message: 'Greska' });
        });
    };

    zatvoriOglas = (req: express.Request, res: express.Response) => {
        let id = req.body.id;
        let kor_ime = req.body.kor_ime
        OglasModel.updateOne({ id: id, autor: kor_ime }, { $set: { status: 'zatvoren' } }).then(() => {
            res.json({ message: 'OK' });
        }).catch(err => {
            console.log(err);
            res.json({ message: 'Greska pri zatvaranju oglasa' });
        });
    }

    zakaziTrening = (req: express.Request, res: express.Response) => {
        const kor_ime = req.body.kor_ime;
        const trenerId = req.body.trenerId;
        const datum = req.body.datum;
        const sat = req.body.sat;
        const idObj = req.body.idObj;

        if (!kor_ime || !trenerId || !datum || !sat || !idObj) {
            res.json({ message: 'Unesite sve podatke za trening' });
        }
        else {
            const pocetak = vremeUDatumu(datum, sat);
            const kraj = vremeKraja(pocetak, 1);

            if (pocetak <= new Date()) {
                res.json({ message: 'Ne mozete zakazati trening u proslosti' });
            }
            else {
                KaznaModel.findOne({
                    objekatId: idObj,
                    kor_ime: kor_ime,
                    blokiran: true
                }).then(kazna => {
                    if (kazna) {
                        res.json({ message: 'Blokirani ste za ovaj objekat' });
                    }
                    else {
                        TrenerModel.findOne({ id: trenerId, status: 'aktivan' }).then(trener => {
                            if (!trener) {
                                res.json({ message: 'Trener nije pronadjen ili nije aktivan' });
                            }
                            else {
                                const objektiTrenera = trener.objekatId;

                                if (!objektiTrenera.includes(idObj)) {
                                    res.json({ message: 'Trener ne radi u izabranom objektu' });
                                }
                                else {
                                    SportskiObjekatModel.findOne({ id: idObj, aktivan: true }).then(objekat => {
                                        if (!objekat) {
                                            res.json({ message: 'Objekat nije pronadjen' });
                                        }
                                        else {
                                            const pocetakMin = pocetak.getHours() * 60 + pocetak.getMinutes();
                                            const krajMin = kraj.getHours() * 60 + kraj.getMinutes();
                                            const radnoOd = vremeUMinute(objekat.radnoVremeOd!);
                                            const radnoDo = vremeUMinute(objekat.radnoVremeDo!);

                                            if (pocetakMin < radnoOd || krajMin > radnoDo) {
                                                res.json({ message: 'Trening je van radnog vremena objekta' });
                                            }
                                            else {
                                                TerminModel.findOne({
                                                    trenerId: trenerId,
                                                    status: 'prihvacen',
                                                    pocetak: { $lt: kraj },
                                                    kraj: { $gt: pocetak }
                                                }).then(zauzetTrener => {
                                                    if (zauzetTrener) {
                                                        res.json({ message: 'Trener je zauzet u tom periodu' });
                                                    }
                                                    else {
                                                        const sportTrenera = trener.sport;
                                                        const tereni = objekat.tereni.filter((teren: any) => teren.sport == sportTrenera);
                                                        const nazivi = tereni.map((teren: any) => teren.naziv);

                                                        TerminModel.find({
                                                            objekatId: idObj,
                                                            terenNaziv: { $in: nazivi },
                                                            status: 'prihvacen',
                                                            pocetak: { $lt: kraj },
                                                            kraj: { $gt: pocetak }
                                                        }).then(zauzetiTermini => {
                                                            const slobodanTeren = tereni.find((teren: any) =>
                                                                !zauzetiTermini.some(termin => termin.terenNaziv == teren.naziv));

                                                            if (!slobodanTeren) {
                                                                res.json({ message: 'Nema slobodnog terena za taj sport' });
                                                            }
                                                            else {
                                                                const noviTermin = new TerminModel({
                                                                    id: `id${Date.now()}`,
                                                                    objekatId: idObj,
                                                                    objekatNaziv: objekat.naziv,
                                                                    terenNaziv: slobodanTeren.naziv,
                                                                    grad: objekat.grad,
                                                                    sport: sportTrenera,
                                                                    kor_ime: kor_ime,
                                                                    tip: 'trening',
                                                                    pocetak: pocetak,
                                                                    kraj: kraj,
                                                                    status: 'na cekanju',
                                                                    prisustvo: '',
                                                                    trenerId: trenerId
                                                                });

                                                                noviTermin.save().then(() => {
                                                                    res.json({ message: 'OK' });
                                                                }).catch(err => {
                                                                    console.log(err);
                                                                    res.json({ message: 'Greska' });
                                                                });
                                                            }
                                                        }).catch(err => {
                                                            console.log(err);
                                                            res.json({ message: 'Greska' });
                                                        });
                                                    }
                                                }).catch(err => {
                                                    console.log(err);
                                                    res.json({ message: 'Greska' });
                                                });
                                            }
                                        }
                                    }).catch(err => {
                                        console.log(err);
                                        res.json({ message: 'Greska' });
                                    });
                                }
                            }
                        }).catch(err => {
                            console.log(err);
                            res.json({ message: 'Greska' });
                        });
                    }
                }).catch(err => {
                    console.log(err);
                    res.json({ message: 'Greska pri proveri kazne' });
                });
            }
        }
    };

    naruciKorpu = (req: express.Request, res: express.Response) => {
        const kor_ime = req.body.kor_ime;
        const primljeneStavke = req.body.stavke;

        if (!kor_ime || !Array.isArray(primljeneStavke) || primljeneStavke.length == 0) {
            res.json({ message: 'Korpa je prazna' });
            return;
        }

        const kolicinePoProizvodu = new Map<string, number>();

        for (let stavka of primljeneStavke) {
            const opremaId = String(stavka.opremaId || '');
            const kolicina = Number(stavka.kolicina);

            if (!opremaId || !Number.isInteger(kolicina) || kolicina <= 0) {
                res.json({ message: 'Neispravna stavka u korpi' });
                return;
            }

            kolicinePoProizvodu.set(opremaId, Number(kolicinePoProizvodu.get(opremaId) || 0) + kolicina);
        }

        const ids = Array.from(kolicinePoProizvodu.keys());

        OpremaModel.find({ id: { $in: ids } }).then(oprema => {
            if (oprema.length != ids.length) {
                res.json({ message: 'Oprema koju ste narucili ne postoji' });
                return;
            }

            const stavkeNarudzbine: any[] = [];

            for (let opremaId of ids) {
                const proizvod = oprema.find(o => o.id == opremaId);
                const kolicina = Number(kolicinePoProizvodu.get(opremaId));

                if (!proizvod || Number(proizvod.zalihe || 0) < kolicina) {
                    res.json({ message: 'Nema dovoljno opreme na stanju' });
                    return;
                }
                else if (!proizvod.firmaId) {
                    res.json({ message: 'Oprema nije povezana sa firmom' });
                    return;
                }

                const cena = Number(proizvod.cena || 0);
                const ukupnoStavke = cena * kolicina;

                stavkeNarudzbine.push({
                    firmaId: proizvod.firmaId,
                    objekatId: proizvod.objekatId || '',
                    opremaId: opremaId,
                    opremaNaziv: proizvod.naziv,
                    cena: cena,
                    kolicina: kolicina,
                    ukupno: ukupnoStavke
                });
            }

            const vremeNarucivanja = new Date();
            const osnovaId = Date.now();
            const slucajniDeo = Math.floor(Math.random() * 1000000000);
            const kupovinaId = `kupovina${osnovaId}_${slucajniDeo}`;
            const narudzbineZaUpis = stavkeNarudzbine.map((stavka, indeks) => {
                return {
                    id: `id${osnovaId}_${slucajniDeo}_${indeks + 1}`,
                    kupovinaId: kupovinaId,
                    firmaId: stavka.firmaId,
                    kor_ime: kor_ime,
                    stavke: [stavka],
                    ukupno: stavka.ukupno,
                    status: 'naruceno',
                    zaliheVracene: false,
                    datumNarucivanja: vremeNarucivanja,
                    datumPreuzimanja: null
                };
            });

            const rezervisaneStavke: any[] = [];

            const vratiRezervisaneZalihe = (poruka: string) => {
                if (rezervisaneStavke.length == 0) {
                    res.json({ message: poruka });
                }
                else {
                    const vracanjeZaliha = rezervisaneStavke.map(stavka => {
                        return {
                            updateOne: {
                                filter: {
                                    id: stavka.opremaId,
                                    firmaId: stavka.firmaId
                                },
                                update: { $inc: { zalihe: stavka.kolicina } }
                            }
                        };
                    });

                    OpremaModel.bulkWrite(vracanjeZaliha).then(result => {
                        if ((result as any).matchedCount != rezervisaneStavke.length) {
                            res.json({ message: 'Greska pri vracanju rezervisanih zaliha' });
                        }
                        else {
                            res.json({ message: poruka });
                        }
                    }).catch(err => {
                        console.log(err);
                        res.json({ message: 'Greska pri vracanju rezervisanih zaliha' });
                    });
                }
            };

            const sacuvajNarudzbine = () => {
                NarudzbinaModel.insertMany(narudzbineZaUpis).then(() => {
                    res.json({ message: 'OK' });
                }).catch(err => {
                    console.log(err);

                    NarudzbinaModel.deleteMany({
                        kupovinaId: kupovinaId,
                        kor_ime: kor_ime
                    }).then(() => {
                        vratiRezervisaneZalihe('Greska pri narucivanju korpe');
                    }).catch(errBrisanje => {
                        console.log(errBrisanje);
                        res.json({ message: 'Greska pri ponistavanju neuspele kupovine' });
                    });
                });
            };

            const rezervisiSledecuStavku = (indeks: number) => {
                if (indeks == stavkeNarudzbine.length) {
                    sacuvajNarudzbine();
                }
                else {
                    const stavka = stavkeNarudzbine[indeks];

                    OpremaModel.updateOne(
                        {
                            id: stavka.opremaId,
                            firmaId: stavka.firmaId,
                            zalihe: { $gte: stavka.kolicina }
                        },
                        { $inc: { zalihe: -stavka.kolicina } }
                    ).then(result => {
                        if ((result as any).modifiedCount == 0) {
                            vratiRezervisaneZalihe('Nema dovoljno opreme na stanju');
                        }
                        else {
                            rezervisaneStavke.push(stavka);
                            rezervisiSledecuStavku(indeks + 1);
                        }
                    }).catch(err => {
                        console.log(err);
                        vratiRezervisaneZalihe('Greska pri azuriranju zaliha');
                    });
                }
            };

            rezervisiSledecuStavku(0);
        }).catch(err => {
            console.log(err);
            res.json({ message: 'Greska pri pronalazenju opreme' });
        });
    };

    dohvatiOceneObjekta = (req: express.Request, res: express.Response) => {
        OcenaModel.find({ objekatId: req.body.objekatId }).sort({ datum: -1 }).limit(5).then(ocene => {
            res.json(ocene);
        }).catch(err => {
            console.log(err);
            res.json([]);
        });
    }

    dohvatiOglaseSportista = (req: express.Request, res: express.Response) => {
        const kor_ime = req.body.kor_ime;
        const danas = new Date();
        danas.setHours(0, 0, 0, 0)
        OglasModel.find({
            datum: { $gte: danas },
            $or: [
                { status: 'aktivan' },
                { 'zahtevi.kor_ime': kor_ime }
            ]
        }).sort({ datumKreiranja: -1 }).then(oglasi => {
            res.json(oglasi);
        }).catch(err => {
            console.log(err);
            res.json([]);
        });
    }

    dodajOcenu = (req: express.Request, res: express.Response) => {
        const data = req.body;

        if (!data.objekatId || !data.kor_ime || !data.reakcija) {
            res.json({ message: 'Greska nepotpuni podaci' });
        }
        else {
            TerminModel.countDocuments({
                objekatId: data.objekatId,
                kor_ime: data.kor_ime,
                status: 'prihvacen',
                prisustvo: 'dosao'
            }).then(terminCnt => {
                if (terminCnt == 0) {
                    res.json({ message: 'Nemate oitvrdjenu rez u objektu' });
                }
                else {
                    OcenaModel.countDocuments({ objekatId: data.objekatId, kor_ime: data.kor_ime }).then(brojOcena => {
                        if (brojOcena >= terminCnt) {
                            res.json({ message: 'Broj ocena i komentara ne moze biti veci od broja dolazaka u ovaj objekat' });
                        }
                        else {
                            SportskiObjekatModel.findOne({ id: data.objekatId }).then(objekat => {
                                const novaOcena = new OcenaModel({
                                    id: `id${Date.now()}`,
                                    objekatId: data.objekatId,
                                    objekatNaziv: (objekat as any)?.naziv || '',
                                    kor_ime: data.kor_ime,
                                    reakcija: data.reakcija,
                                    komentar: data.komentar || '',
                                    datum: new Date()
                                });

                                novaOcena.save().then(() => {
                                    if (data.reakcija == 'lajk') {
                                        SportskiObjekatModel.updateOne(
                                            { id: data.objekatId },
                                            { $inc: { lajkovi: 1 } }
                                        ).then(() => {
                                            res.json({ message: 'OK' });
                                        }).catch(err => {
                                            console.log(err);
                                            res.json({ message: 'Greska pri cuvanju ocene' });
                                        });
                                    }
                                    else {
                                        SportskiObjekatModel.updateOne(
                                            { id: data.objekatId },
                                            { $inc: { dislajkovi: 1 } }
                                        ).then(() => {
                                            res.json({ message: 'OK' });
                                        }).catch(err => {
                                            console.log(err);
                                            res.json({ message: 'Greska pri cuvanju ocene' });
                                        });
                                    }
                                }).catch(err => {
                                    console.log(err);
                                    res.json({ message: 'Greska pri cuvanju ocene' });
                                });
                            }).catch(err => {
                                console.log(err);
                                res.json({ message: 'Greska pri cuvanju ocene' });
                            });
                        }
                    }).catch(err => {
                        console.log(err);
                        res.json({ message: 'Greska pri cuvanju ocene' });
                    });
                }
            }).catch(err => {
                console.log(err);
                res.json({ message: 'Greska pri cuvanju ocene' });
            });
        }
    };
}

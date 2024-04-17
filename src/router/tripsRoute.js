const tripRouter = require('express').Router()
const mongoose = require('mongoose')
const { trip, user, car } = require('../middleware/db')
const { calculateScoreTrajet } = require('../controller/score')
//Read
tripRouter.get("/get/:id?", async (req, res) => {
    const id = req.body.id ? req.body.id : ""
    if (id) {
        trip.findOne({ _id: id }).then((trip) => {
            res.send(trip)
        })
    } else {
        trip.find().then((trips) => {
            res.send(trips)
        })
    }
})
//Create
tripRouter.post("/create", async (req, res) => {
    const currenttrip = {
        debut: req.body.debut ? req.body.debut : "",
        fin: req.body.fin ? req.body.fin : "",
        distance: req.body.distance ? req.body.distance : "",
        conducteurs: req.body.conducteurs ? new mongoose.Types.ObjectId(req.body.conducteurs) : null,
        lieuDepart: req.body.lieuDepart ? req.body.lieuDepart : "",
        lieuFin: req.body.lieuFin ? req.body.lieuFin : "",
        passagers: [],
    }
    console.log(currenttrip)
    if (currenttrip.debut.trim() == "" || currenttrip.fin.trim() == "" || currenttrip.distance.trim() == "" || !currenttrip.conducteurs || currenttrip.lieuDepart.trim() == "" || currenttrip.lieuFin.trim() == "") {
        return res.send("incorrect format")
    }
    user.findOne({ _id: req.body.conducteurs }).then(
        data => {
            if (!data) {
                return res.send({ "message": "driver not found" })
            }
            if (data.vehicules != null) {
                trip.insertMany([currenttrip]).then()
                return res.send(currenttrip)
            } else {
                return res.send({ "message": "not a driver" })
            }
        }
    )
})
//add passenger
tripRouter.post("/passenger/add/:id", async (req, res) => {
    const id = req.params.id ? req.params.id : ""
    const passenger = req.body.passenger ? req.body.passenger : ""
    if (id.trim() == "" || !passenger) {
        return res.send({ "message": "missing argument" })
    }
    trip.findOne({ _id: id }).then(
        currentTrip => {
            if (!currentTrip) {
                return res.send({ "message": "trip not found" })
            }
            user.findOne({ _id: currentTrip.conducteurs }).then(
                conducteur => {
                    if (!conducteur) {
                        return res.send({ "message": "driver not found" })
                    }
                    car.findOne({ _id: conducteur.vehicules }).then(
                        voiture => {
                            if (!voiture) {
                                return res.send({ "message": "car not found" })
                            }
                            if (currentTrip.passagers.length == voiture.capacite) {
                                return res.send({ "message": "car is full" })
                            }
                            user.findOne({ _id: req.body.passenger }).then(
                                passager => {
                                    if (!passager) {
                                        return res.send({ "message": "passenger not found" })
                                    }
                                    if(req.body.passenger==currentTrip.conducteurs){
                                        return res.send({ "message": "can't add driver to passenger" })
                                    }
                                    if(currentTrip.passagers.includes(passenger)){
                                        return res.send({ "message": "passenger already in" })
                                    }
                                    currentTrip.passagers.push(passenger)
                                    trip.findOneAndUpdate({ _id: id }, { passagers: currentTrip.passagers }).then(
                                        () => {
                                            let newScore = passager.score + calculateScoreTrajet(parseFloat(currentTrip.distance), parseFloat(voiture.facteurEmision), parseFloat(voiture.consoLitreParCentKm))
                                            user.findOneAndUpdate({ _id: passenger }, { score: newScore }).then(
                                                () => {
                                                    newScore = conducteur.score + calculateScoreTrajet(parseFloat(currentTrip.distance), parseFloat(voiture.facteurEmision), parseFloat(voiture.consoLitreParCentKm))
                                                    user.findOneAndUpdate({ _id: currentTrip.conducteurs }, { score: newScore }).then()
                                                }
                                            )
                                        }
                                    )
                                    return res.send({ "message": "added passenger" })
                                }
                            )
                        }
                    )
                }
            )
        }
    )
})

tripRouter.post("/passenger/remove/:id", async (req, res) => {
    const id = req.params.id ? req.params.id : ""
    const passenger = req.body.passenger ? req.body.passenger : ""
    if (id.trim() == "" || !passenger) {
        return res.send({ "message": "missing argument" })
    }
    trip.findOne({ _id: id }).then(
        currentTrip => {
            if (!currentTrip) {
                return res.send({ "message": "trip not found" })
            }
            user.findOne({ _id: currentTrip.conducteurs }).then(
                conducteur => {
                    if (!conducteur) {
                        return res.send({ "message": "driver not found" })
                    }
                    car.findOne({ _id: conducteur.vehicules }).then(
                        voiture => {
                            if (!voiture) {
                                return res.send({ "message": "car not found" })
                            }
                            user.findOne({ _id: req.body.passenger }).then(
                                passager => {
                                    if (!passager) {
                                        return res.send({ "message": "passenger not found" })
                                    }
                                    if(req.body.passenger==currentTrip.conducteurs){
                                        return res.send({ "message": "can't add driver to passenger" })
                                    }
                                    let newPassagersList = []
                                    for(let item of currentTrip.passagers){
                                        console.log(item, passenger)
                                        if(item!=passenger){
                                            newPassagersList.push(item)
                                        }
                                    }
                                    trip.findOneAndUpdate({ _id: id }, { passagers: newPassagersList }).then(
                                        () => {
                                            let newScore = passager.score - calculateScoreTrajet(parseFloat(currentTrip.distance), parseFloat(voiture.facteurEmision), parseFloat(voiture.consoLitreParCentKm))
                                            if(newScore < 0){
                                                newScore=0
                                            }
                                            user.findOneAndUpdate({ _id: passenger }, { score: newScore }).then(
                                                () => {
                                                    newScore = conducteur.score - calculateScoreTrajet(parseFloat(currentTrip.distance), parseFloat(voiture.facteurEmision), parseFloat(voiture.consoLitreParCentKm))
                                                    if(newScore < 0){
                                                        newScore=0
                                                    }
                                                    user.findOneAndUpdate({ _id: currentTrip.conducteurs }, { score: newScore }).then()
                                                }
                                            )
                                        }
                                    )
                                    return res.send({ "message": "removed passenger" })
                                }
                            )
                        }
                    )
                }
            )
        }
    )
})
//Delete
tripRouter.post("/delete/:id", async (req, res) => {
    const id = req.params.id ? req.params.id : ""
    if (id.trim() == "") {
        return res.send("missing id")
    }
    await trip.findOneAndDelete({ _id: id });
    res.send(id)
})
//Update
tripRouter.post("/update/:id", async (req, res) => {
    const id = req.params.id ? req.params.id : ""
    const bodyData = {
        debut: req.body.debut ? req.body.debut : "",
        fin: req.body.fin ? req.body.fin : "",
        distance: req.body.distance ? req.body.distance : "",
        lieuDepart: req.body.lieuDepart ? req.body.lieuDepart : "",
        lieuFin: req.body.lieuFin ? req.body.lieuFin : ""
    }
    trip.findOne({ _id : id }).then(
        currentTrip => {
            if(!currentTrip){
                return res.send({ "message": "trip not found" })
            }
            let newTrip = {}
            newTrip.debut = bodyData.debut ? bodyData.debut : currentTrip.debut
            newTrip.fin = bodyData.fin ? bodyData.fin : currentTrip.fin
            newTrip.distance = bodyData.distance ? bodyData.distance : currentTrip.distance
            newTrip.lieuDepart = bodyData.lieuDepart ? bodyData.lieuDepart : currentTrip.lieuDepart
            newTrip.lieuFin = bodyData.lieuFin ? bodyData.lieuFin : currentTrip.lieuFin
            trip.findOneAndUpdate({ _id: id }, {debut:newTrip.debut, fin:newTrip.fin, distance:newTrip.distance, lieuDepart:newTrip.lieuDepart, lieuFin:newTrip.lieuFin}).then(
                data => {
                    if(!data){
                        return res.send({ "message": "trip not found" })
                    }
                    return res.send(newTrip)
                }
            )
        }
    )
})

module.exports = { tripRouter }
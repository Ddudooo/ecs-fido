/**
 * @swagger
 * tags :
 *   name : Fido
 *   description : Fido API
 */

var express = require('express');
var base64url = require('base64url');
var regenerate = require('regenerate');
var request = require('request');
var appRoot = require('app-root-path');
var fidoUser = require(appRoot+'/models/fidoUser');

var router = express.Router();

// url /fido/reg/*

/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('fido/webAuthn', {
        title: 'Fido Hackathon WebAuthn Test Web'
    });
});
/**
 * @swagger
 * /fido/reg/challenge/:
 *      post:
 *          summary : Fido Register challenge
 *          tags : [Fido]          
 *          parameters:
 *              -   in : body
 *                  name : regData
 *                  description : Fido Register Challenge
 *                  schema :
 *                      type : object
 *                      properties : 
 *                          username :
 *                              type : string
 *                          displayName :
 *                             type : string
 *                          authenticatorSelection :
 *                              type : object 
 *                              properties :
 *                                  authenticatorAttachment:
 *                                      type : string
 *                                  requireResidentKey:
 *                                      type : boolean
 *                                  userVerification:
 *                                      type : string
 *                                  attestation:
 *                                      type : string
 *                      example:
 *                          username : test
 *                          displayName : test
 *                          authenticatorSelection :
 *                              authenticatorAttachment: platform
 *                              requireResidentKey : false
 *                              userVerification : preferred
 *                              attestation : none
 *                          
 *          responses :
 *              200 : 
 *                  description : Check Success Data 
 *                          
 */

router.post('/challenge', function (req, res, next) {
    console.log("get Register Challenge");
    console.log(req.body);
    // 사용자 데이터 검증 후 
    const params={
        "rp": {
            "name" : "ecs-rp",
            "id": "www.ecs-fido.com"
        },
        "user": {
            "name": req.body.username,
            "id": Buffer.from(req.body.username+req.body.displayName).toString('base64'),
            "displayName": req.body.displayName
        },
        "authenticatorSelection": {
            "authenticatorAttachment": req.body.authenticatorSelection.authenticatorAttachment,
            "requireResidentKey": req.body.authenticatorSelection.requireResidentKey,
            "userVerification": req.body.authenticatorSelection.userVerification
        },
        "attestation": req.body.authenticatorSelection.attestation 
    };
    console.log("params >>> ");
    console.log(params);
    const options = {
        uri: 'https://prod-fido-fido2-server.line-apps.com/server/fido2/reg/challenge',
        method: 'POST',
        body: params,
        json: true
    };
    request.post(options, function(error,response,body){
        console.log('error:', error); // Print the error if one occurred
        console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
        console.log('body:', body); // Print the HTML for the Google homepage
        if(response && response.statusCode == 200){
	        delete body.serverResponse;
	        body.status="ok";
	        body.attestation=params.attestation;
	        res.cookie('sessionId', body.sessionId);
            res.send(body);
            let userInfo = {
                rpid : "www.ecs-fido.com",
                id : body.user.id,
                name : body.user.name,
                displayName : body.user.displayName,
                sessionId : body.sessionId
            }
            fidoUser(userInfo).save().then((result)=>{
                console.log(result);
                console.log("setTimeout..."+body.timeout);
                setTimeout(()=>{
                    fidoUser.findOne(result)
                            .exec((err,timeOutUser)=>{
                    if(timeOutUser.state!="CONFIRM"){
                            console.log(timeOutUser);
                            fidoUser.deleteOne(result)
                                    .then((output)=>{
                                        console.log("TIMEOUT...");
                                        console.log(output);
                                    })
                                    .catch((err)=>{
                                        console.error(err);
                                    })
                    }else{
                        console.log("CONFIRM USER");
                        console.log(timeOutUser);
                    }
                            });
                    
                }, body.timeout);
            }).catch((err)=>{
                console.error(err);
            });
        }else{
            res.send(body);
        }
    });

        
});
/**
 * @swagger
 * /fido/reg/attestation/result/:
 *      post :
 *          summary : Fido Register Response
 *          tags : [Fido]
 *          parameters:
 *              -   in : body
 *                  name : regResponse
 *                  type : object
 *                  properties :
 *                      id : 
 *                          type : string
 *                          example : ANYT_i8ijCUb8Z2nTf4u-vCf0qPnDhaYnO-p-WRWZH-S9WLZtpIQ7FjXrXzwgyJftSM_t9LBr4zQAxnVDhpB3_y-994Hrz30PBrpYcFNR8nJaKn-BmseolfhtPnjVS-2d5pglg
 *                      type :
 *                          type : string 
 *                          example : public-key
 *                      response :
 *                          type : object
 *                          properties :
 *                              clientDataJSON :
 *                                  type : string
 *                                  example : eyJjaGFsbGVuZ2UiOiJ3cTRWVUxrME51cU1CTEk3c1BfUjdSMEJLanBDZmREYl8zOGVSc2ZaV2FxWjgtOElsc2lGbDcwT1dPb1FUcjg0Yzk1TU40NXhxbnhOLWVoNjhXWjFhUSIsIm9yaWdpbiI6Imh0dHA6Ly9sb2NhbGhvc3Q6ODA4MCIsInR5cGUiOiJ3ZWJhdXRobi5jcmVhdGUifQ
 *                              attestationObject :
 *                                  type : string
 *                                  example : o2NmbXRmcGFja2VkZ2F0dFN0bXSiY2FsZyZjc2lnWEcwRQIgEcYweMLdeqXZeGdhiTJybxBXpe358cwiHBkMC4L1KAsCIQDV4TR7csCzdVw0GznW618JH8V9xcAsFiaru8-dsiS8mGhhdXRoRGF0YVjoSZYN5YgOjGh0NBcPZHZgW4_krrmihjLHmVzzuoMdl2NFW9FmTQAAAAAAAAAAAAAAAAAAAAAAZADWE_4vIowlG_Gdp03-Lvrwn9Kj5w4WmJzvqflkVmR_kvVi2baSEOxY16188IMiX7UjP7fSwa-M0AMZ1Q4aQd_8vvfeB6899Dwa6WHBTUfJyWip_gZrHqJX4bT541UvtneaYJalAQIDJiABIVggLUl0qbsTH3N2kQhXiTiNxifzb2z34X8ZNPf71r2vAUkiWCB9xtKPKa9f-4ZkizYhDqtaSZ0lC55UpVYYHN37lkKWcA
 *          responses :
 *              200 : 
 *                  description : 성공
 */
router.post('/attestation/result', (req,res, next)=>{
    console.log("POST '/fido/reg/attestation/result' \n");
    console.log(req.body);
    let sessionId = req.cookies.sessionId;
    console.log("\nsessionId ");
    console.log(sessionId);
    console.log("\n");
    param = {
	    origin: req.headers['origin'],
	    serverPublicKeyCredential: req.body,
	    sessionId: sessionId,
	    rpId: "www.ecs-fido.com"
    };
    const options ={
	    uri: 'https://prod-fido-fido2-server.line-apps.com/server/fido2/reg/response',
	    method:'POST',
	    body: param,
	    json: true
    };
    request.post(options, (error, response, body)=>{
	    console.log("========================================================================");
	    console.log('error:', error);//print error
	    console.log("========================================================================");
	    console.log('statusCode : ', response && response.statusCode);
	    console.log("________________________________________________________________________");
	    console.log('body : ' , body);
	    console.log("________________________________________________________________________");
	    if( response && response.statusCode == 200 && body.serverResponse.internalError == 'SUCCESS'){            
            body.status = 'ok';
            res.send(body);
            fidoUser.findOne({
                sessionId : sessionId
            }).exec((err, data)=>{
                if(err||!data){
                    //not save but fido server save
                    //retry saving...
                }
                data.aaguid = body.aaguid;
                data.credentialId = body.credentialId;
                data.state = "CONFIRM"
                data.save().then((saveData)=>{
                    console.log(saveData);                    
                }).catch((err)=>{
                    console.error(err);
                })
            })

	    }else{
		    res.send(body);
	    }
    });
    console.log("attestation/result");
});

module.exports = router;

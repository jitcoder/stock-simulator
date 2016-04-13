'use strict';
Date.prototype.yyyymmdd = function() {
    var yyyy = this.getFullYear().toString();
    var mm = (this.getMonth()+1).toString(); // getMonth() is zero-based
    var dd  = this.getDate().toString();
    return yyyy + '-' + (mm[1]?mm:"0"+mm[0]) + '-' + (dd[1]?dd:"0"+dd[0]); // padding
};
 
const fs = require('fs');
const colors = require('colors');

let trades = {
    actions:[],
    inventory:[],
    pl:[],
    balance:2000.00
};

if(fs.existsSync('./trades.json'))
    trades = JSON.parse(fs.readFileSync('./trades.json'));

let cmd = process.argv[2];

function listTrades(){
    console.log('Date\t\tSYM\tPrice\tQty\tAction\tTarget\tStop Loss'.black.bgWhite);
    for(let i = 0; i < trades.actions.length;i++){
        let date = trades.actions[i].date;
        let sym = trades.actions[i].sym;
        let price = '$'.yellow + trades.actions[i].price.toFixed(2).toString().yellow;
        let qty = trades.actions[i].qty;
        let action = trades.actions[i].action.blue;
        
        if(trades.actions[i].action === 'BUY'){
            let stopLoss = '$'.red + (trades.actions[i].price * 0.95).toFixed(2).toString().red;
            let target = '$'.cyan + (trades.actions[i].price * 1.2).toFixed(2).toString().cyan;
            console.log(`${date}\t${sym}\t${price}\t${qty}\t${action}\t${target}\t${stopLoss}`);
        }
        else{
            console.log(`${date}\t${sym}\t${price}\t${qty}\t${action}\t\t`);
        }

    }

}

function listInventory(){
    console.log('SYM\tCost\tQty'.black.bgWhite);
    for(let i = 0; i < trades.inventory.length; i++){
        let sym = trades.inventory[i].sym;
        let cost = '$'.magenta + trades.inventory[i].cost.toFixed(2).toString().magenta;
        let qty = trades.inventory[i].qty.toString().yellow;
        
        console.log(`${sym}\t${cost}\t${qty}`);
    }
}

function listPL(){
    let total = 0;
    
    console.log('Date\t\tSYM\tPL\t'.black.bgWhite);
    for(let i = 0; i < trades.pl.length; i++){
        let date = trades.pl[i].date;
        let sym = trades.pl[i].sym;
        let bal = trades.pl[i].bal.toFixed(2);
        total += trades.pl[i].bal;
        
        if(bal < 0){
            bal = '$'.red + bal.toString().red;
        }
        else{
            bal = '$'.green + bal.toString().green;
        }
        console.log(`${date}\t${sym}\t${bal}`);
    }
    console.log('--------------------------------');
    console.log('Total: \t\t\t'.black.bgWhite + '$'.black.bgWhite + total.toFixed(2).toString().black.bgWhite);
}

function addToInventory(sym,qty,price){
    qty = Number.parseInt(qty);
    price = Number.parseFloat(price);
    for(let i = 0; i < trades.inventory.length;i++){
        if(trades.inventory[i].sym === sym){
            let newQty = trades.inventory[i].qty + qty;
            trades.inventory[i].cost = ((trades.inventory[i].cost * trades.inventory[i].qty) + (qty*price)) / newQty;
            trades.inventory[i].qty = newQty;
            return true;
        }
    }
    
    trades.inventory.push({sym,qty,cost:price});
    return true;
}

function removeFromInventory(sym,qty,price){
    qty = Number.parseInt(qty);
    price = Number.parseFloat(price);
    
    for(let i = 0; i < trades.inventory.length; i++){
        if(trades.inventory[i].sym === sym){
            let newQty = trades.inventory[i].qty - qty;
            if(newQty < 0){
                return false;
            }
            else{
                if(newQty > 0){
                    trades.inventory[i].qty = newQty;
                }
                else{
                    trades.inventory.splice(i,1);
                }
                
                return true;
            }
        }
    }
    return false;
}

function getPL(sym){
    for(let i = 0; i < trades.inventory.length; i++){
        if(trades.inventory[i].sym === sym){
            return trades.inventory[i].cost * trades.inventory[i].qty;
        }
    }
}

function buyAction(sym, price, qty){
    price = Number.parseFloat(price);
    qty = Number.parseInt(qty);
    sym = sym.toUpperCase();
    
    if(trades.balance >= (price*qty + 5)){
        trades.balance -= (price*qty+5);
        if(addToInventory(sym,qty,price)){
            trades.actions.push({date:new Date().yyyymmdd(),sym:sym,price:price,qty:qty,action:'BUY'});
            console.log('Cost   : '.black.bgWhite + '$'.red.bgWhite + (price*qty+5).toFixed(2).toString().red.bgWhite + '\t\t\t'.black.bgWhite);
            console.log('Balance: '.black.bgWhite + '$'.blue.bgWhite + trades.balance.toFixed(2).toString().blue.bgWhite + '\t\t\t'.black.bgWhite);
        }
    }
    else {
        console.log('Insufficient funds!'.red.bgWhite);
    }
}

function sellAction(sym,price,qty){
    price = Number.parseFloat(price);
    qty = Number.parseInt(qty);
    sym = sym.toUpperCase();
    
    let pl = getPL(sym);
    if(removeFromInventory(sym,qty,price)){
        trades.pl.push({date:new Date().yyyymmdd(),sym:sym,bal:price*qty - pl});
        trades.actions.push({date:new Date().yyyymmdd(),sym:sym,price:price,qty:qty,action:'SELL'});
        trades.balance += price * qty;
        let bal = (price*qty - pl).toFixed(2);
        let gain = ((((price*qty)/pl)-1)*100).toFixed(2).toString() + '%';
        if(bal > 0){
            bal = '$'.green.bgWhite + bal.toString().green.bgWhite;
        }
        else{
            bal = '$'.red.bgWhite + bal.toString().red.bgWhite;
        }
        
        console.log('PL (%) : '.black.bgWhite + gain.black.bgWhite + '\t\t\t'.black.bgWhite);
        console.log('PL     : '.black.bgWhite + bal + '\t\t\t'.black.bgWhite);
        console.log('Balance: '.black.bgWhite + '$'.blue.bgWhite + trades.balance.toFixed(2).toString().blue.bgWhite + '\t\t\t'.black.bgWhite);
    }
}

if(cmd === 'buy'){
    if(process.argv.length === 6){
        buyAction(process.argv[3],process.argv[4],process.argv[5]);
    }
    else{
        console.log('Arguments should be "buy SYM price qty"');
    }
}
else if(cmd === 'sell'){
    if(process.argv.length === 6){
        sellAction(process.argv[3],process.argv[4],process.argv[5]);
    }
    else{
        console.log('Arguments should be "sell SYM price qty"');
    }
}
else if(cmd === 'list'){
    if(process.argv[3] === 'trades')
        listTrades();
    else if(process.argv[3] === 'inventory')
        listInventory();
    else if(process.argv[3] === 'pl')
        listPL();
}
else if(cmd === "bal" || cmd === "balance"){
    console.log('Balance: '.black.bgWhite + '$'.blue.bgWhite + trades.balance.toFixed(2).toString().blue.bgWhite);
}
else if(cmd === 'backup'){
    fs.writeFileSync('./trades.backup',JSON.stringify(trades));
}
else if(cmd === 'restore'){
    trades = JSON.parse(fs.readFileSync('./trades.backup'));
    fs.unlinkSync('./trades.backup');
}
fs.writeFileSync('./trades.json',JSON.stringify(trades));

import {test}from'node:test';import assert from'node:assert/strict';import {matchesEqmsSearch}from'./eqmsGlobalSearch.js';
const row={id:125,amount:100.25,extra:{company:'ТЕСТ БАНК'},items:['Москва'],paid:false};
test('search traverses every field and nested value case-insensitively',()=>{for(const q of ['125','100.25','тест банк','мОсквА','false',''])assert.equal(matchesEqmsSearch(row,q),true);assert.equal(matchesEqmsSearch(row,'missing'),false);});
test('search also includes displayed labels and handles null',()=>{assert.equal(matchesEqmsSearch(row,'Оплачено',['Оплачено']),true);assert.equal(matchesEqmsSearch(null,'needle'),false);});

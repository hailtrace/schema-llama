"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
const ValidationError = message => new Error(`ValidationError: ${message}`);
exports.ValidationError = ValidationError;
exports.TypeError = TypeError;
exports.Error = Error;
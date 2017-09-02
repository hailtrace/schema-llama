require('babel-register');
const assert = require('assert');
const SchemaLibrary = require('../src');
const { default: Schema, Validators } = SchemaLibrary;

describe('SchemaJS Tests', () => {
  describe('Factory', () => {
    it('Should support simple schema validation.', () => {
      const Llama = Schema({
        name: String,
        dob: Date,
        age: Number,
        people: [ String ],
        coordinates: [[ Number ]],
        favorite: {
          date: Date
        }
      })({
        attemptCast: false
      });

      class FunnyLlama extends Llama { //Class that becomes a subclass of llama schema.
        constructor(props) {
          super(props); //Do annoying magic.
        }
        getNextAge() {
          return this.age + 1;
        }
      }

      const llama = new FunnyLlama({
        name: 'ABC',
        dob: new Date(Date.now()),
        people: ['b'],
        coordinates: [[]],
        favorite: null
      });
      assert(llama.name === 'ABC', 'Llama should have the name ABC.');
      // assert(llama.favorite === null, 'Llama favorite should be null.');
      console.log(llama.favorite);
    });

    it('Should support embedded schema validation.', () => {

    });

    it('Should support embedded es6 class validation.', () => {

    });

    it('Should support embedded validators.', () => {

    });
  });

  describe('Validator Library', () => {
    it('Should contain a valid Enum validator.', () => {

    });

    it('Should contain a valid Number validator.', () => {

    });

    it('Should contain a valid String validator.', () => {

    });
  })

})

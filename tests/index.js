require('babel-register');
const assert = require('assert');
const SchemaLibrary = require('../src');
const { default: Schema, validator } = SchemaLibrary;

describe('SchemaJS Tests', () => {
  describe('Factory', () => {
    it('should support simple schema validation', () => {
      const Llama = Schema({
        name: String,
        dob: Date,
        age: Number,
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
        dob: new Date(),
        age: 13
      });
      assert(llama.name === 'ABC', 'Llama should have the name ABC');
      assert(llama.name.constructor === String, 'Llama name should be a string');
      assert(llama.dob.constructor === Date, 'Llama birthday should be a date');
      assert(llama.age == 13, 'Llama age should be 13');
    });

    it('should support embedded schema validation', () => {
      class Llama extends Schema({
        name: String,
        dob: Date,
        age: Number,
        books: [
          { author: String, title: String }
        ]
      })({
        attemptCast: false
      }) {
        constructor(props) {
          super(props)
        }
      }

      const bookLlama = new Llama({
        name: 'Drama Llama',
        dob: new Date('Jan 1, 2015'),
        age: 2,
        books: [
          { author: 'James R. White', title: 'The God Who Justifies' },
          { author: 'Helm', title: 'Expositional Preaching' }
        ]
      });
      const { books } = bookLlama;
      assert(books.constructor === Array, 'Books should be an array');
      assert(books[0].author.constructor === String, 'Book authors should be strings');
      assert(books.length == 2, 'There should be two books');

      assert.throws(() => {
        const badLlama = new Llama({
          books : [ 'Happy Llama!' ]
        });
      }, 'Bad llamas should not be accepted');

      assert.throws(() => {
        const evilLlama = new Llama({
          books: [[[[]]]]
        });
      }, 'Evil llamas should not be accepted');

      assert.throws(() => {
        const stupidLlama = new Llama({
          books : 'Test'
        })
      }, 'Stupid llamas should not be accepted');
    });

    it('should support embedded es6 class validation', () => {
      class Book extends Schema({
        title: String,
        author: String
      })() {

      };

      class Llama extends Schema({
        name: String,
        dob: Date,
        age: Number,
        books: [ Book ]
      })({
        attemptCast: false
      }) {

      };

      const llama = new Llama({
        name: 'Book Llama',
        dob: new Date('Jan 1, 2015'),
        age: 12,
        books : []
      });

      const books = [
        new Book({ title: 'Test Title' }),
        new Book({ title: 'Test Title 2' })
      ];

      llama.books = books;

      assert(llama.books.length == 2, 'There should be 2 books');
      llama.books.forEach(book => assert(book.constructor === Book, 'Books must be book instances'));
      assert(llama.books[0].title == 'Test Title', 'Books must accurately store data');

      assert.throws(() => {
        llama.books[0].title = 1;
      }, 'Child objects should have validation');

      assert.throws(() => {
        try {
          const books = [
            { title: 'Test Title' } //This should throw in strict mode.
          ];
          llama.books = books;
        } catch(ex) {
          throw ex;
        }
      }, 'Books should be schema validated');

      class LooseLlama extends Schema({
        name: String,
        books: [ Book ]
      })({
        attemptCast: true
      }) {
        getBooks() {
          return this.books;
        }
      }

      const looseLlama = new LooseLlama({
        name: 'Loose Llama'
      });

      const looseLlamaBooks = [
        { title: 'Test Book' }
      ];

      looseLlama.books = looseLlamaBooks;
      assert(looseLlama.books[0].constructor === Book, 'Books should be casted automagically');
      assert(looseLlama.getBooks().constructor === Array, 'Books should be an array of Books');

      assert.throws(() => {
        const badBooks = [
          { title: 1 }
        ];
        looseLlama.books = badBooks;
      }, 'Books should be strictly validated')

      class OneBookLLama extends Schema({
        name: String,
        book: Book
      })({ attemptCast: true }) {};

      const obl = new OneBookLLama({ name: 'OneBookLLama', book: { title: 'OBL Title' } });

      assert(obl.book instanceof Book, `obl.book should be casted to instance of 'Book'`);

      class ID {
        constructor(props) {
          this.id = props;
        }
      }

      class LlamaWithId extends Schema({
        _id: ID,
        name: String
      })({ attemptCast: true }) {};

      const lid = new LlamaWithId({ _id: 'asdfa', name: 'Cool Llama' });

      assert(lid._id instanceof ID, 'lid._id should be instance of ID');
    });

    it('should support embedded validators', () => {
      class Llama extends Schema({
        name: validator((value) => {
          if(value.constructor !== String) {
            throw new TypeError('You must provide a string to name');
          }
          if(value.length < 10) {
            throw new TypeError('Llama names must be bigger than 10 characters');
          }
          return value;
        }),
      })({
        attemptCast: true
      }) {

      }

      const llama = new Llama({
        name: 'Comma Llama'
      });

      assert.throws(() => {
        llama.name = 'Too Short';
      }, 'Invalid names should not work');
      assert.throws(() => {
        llama.name = 123; //Invalid type.
      }, 'Invalid names should not work');

    });

    it('should support array of validators', () => {
      class Book {
        constructor(props = {}) {
          this.title = props.title || '';
          this.author = props.author || '';
        }
      };

      const llamaValidator = validator((value) => {
        if(!value.title || !value.author) {
          throw new Error(`Book must include a title and an auther`);
        }
        return new Book(value);
      });

      class Llama extends Schema({
        books: [ llamaValidator ]
      })({ attemptCast: true }) {};

      const l1_props = {
        books: [
          { title: 'Good', author: 'Stuff' }
        ]
      };
      const l1 = new Llama(l1_props);
      assert(l1.books instanceof Array, `l1.books should be an array`);
      assert(l1.books[0] instanceof Book, `l1.books[0] should be an instance of 'Book'`);

      assert.throws(() => {
        const l2_props = {
          books: [ { title: null, author: 'Teddy' } ]
        }
        l2 = new Llama(l2_props);
      }, 'Should validate that books have a title');
    });
  });

  describe('Validator Library', () => {
    it('should contain a valid Enum validator', () => {
      assert(false, 'Not implemented')
    });

    it('should contain a valid Number validator', () => {
      assert(false, 'Not implemented')
    });

    it('should contain a valid String validator', () => {
      assert(false, 'Not implemented')
    });
  })

})

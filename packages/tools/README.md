# @sc-voice/tools
Javascript libary for SC-Voice applications

* Math 
* Text
* Graph

## Math.Fraction
```
let f = new Fraction(9, 240, 'segments');
console.log(f.value); // 0.375
console.log(f.numerator, f.denominator); // 9 240
console.log(f.n, f.d); // 9 240
console.log(f.toString()); // 1/2 segments
console.log(Fraction.gcd(9, 240)); // 3
console.log(f.difference); // -150
console.log(f.remainder); // 9
console.log(f.percent); // '4%'
console.log(f.add(new Fraction(1,80)); // new Fraction(4,80)
```

## Text.WordSpace
Used for text similarity comparison, WordSpace creates and compares
Vectors of words weighted by normalized frequency of occurrence.
Weights and scores are normalized to the interval [0..1].

## Text.MerkleJson
Computing the hash of JSON objects can be tricky because JSON.stringify()
does not have a guaranteed string representation of a Javascript object.
Specifically, the following are equivalent and valid outputs of JSON.stringify():

```js
var json = "{size:{w:100,h:200}}";
var json = "{size:{h:100,w:200}}"; ```

MerkleJson guarantees a unique hash code for any Javascript object.
In addition, MerkleJson is efficient in that it only recalculates 
object hashes if the object has no Merkle hash tag. If a Merkle hash
tag is present, its value is returned as the hash value of that object.

### Serialize JSON object
Unlike JSON, MerkleJson serializes objects canonically.

```js
var obj = {
    d:4,
    b:2,
    a:1,
    c:3,
};
console.log(JSON.stringify(obj)); // {"d":4,"b":2,"a":1,"c":3}
var mj = new MerkleJson();
console.log(mj.stringify(obj)); // {"a":1,"b":2,"c":3,"d":4}
```

### Compute hash of JSON object
```js
var mj = new MerkleJson();
var hash = mj.hash({
    size:{
        w:100,
        h:200
    }
}); // e77b735125fec27a61c6f54b17fb6221

var hash = mj.hash({
    size:{ // hash is independent of property order
        h:200
        w:100,
    }
}); // e77b735125fec27a61c6f54b17fb6221
```
### Do not calculate hash if merkleHash is present
```js
var mj = new MerkleJson();
var useMerkleHash = true;
var hash = mj.hash({
    any1: thing1, 
    any2: thing2, 
    any3: thing3, 
}, useMerkleHash); // 441e4f8dabdc6cb17dc9500cee73155b

var hash = mj.hash({
    ... // anything
    merkleHash: e77b735125fec27a61c6f54b17fb6221, 
}, useMerkleHash); // e77b735125fec27a61c6f54b17fb6221

var useMerkleHash = false; // force hash calculation
var hash = mj.hash({
    any1: thing1, 
    any2: thing2, 
    any3: thing3, 
    merkleHash: e77b735125fec27a61c6f54b17fb6221, // ignored
}, useMerkleHash); // 441e4f8dabdc6cb17dc9500cee73155b
```

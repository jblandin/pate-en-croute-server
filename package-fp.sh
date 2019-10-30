#!/bin/bash

source="./"
target="./prod"

rm -rf $target

mkdir -p $target/fp

cp -r $source/bin $target/fp
cp -r $source/dist $target/fp
cp $source/ecosystem.config.js $target/fp
cp $source/package* $target/fp

tar czf $target/fp-prod.tar.gz --directory $target fp

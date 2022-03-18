#!/bin/bash

message=`git log -1 --pretty=%B | cat`

if [[ $message == *"skip ci"* ]] ; then
  echo "🛑 Skipping deploy"
  exit 0;

else
  exit 1;
fi
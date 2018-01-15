#!/bin/bash
if [ -z "$1" ]; 
    then 
        echo "Missing arguments:Expected: sh format-ouput.sh 1000 100"
else
        mkdir -p output-$(hostname)/$1"tps-"`expr $1 \* 10`"load"
        mv  *.csv output-$(hostname)/$1"tps-"`expr $1 \* 10`"load"
fi
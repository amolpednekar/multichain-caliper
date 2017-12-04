#!/bin/bash

docker rm -f $(docker ps -aq)

rm -rf node-files/*

dos2unix ./node-scripts/runchain_caliper_master.sh
dos2unix ./node-scripts/runchain_caliper_slave1.sh
dos2unix ./node-scripts/runchain_caliper_slave2.sh
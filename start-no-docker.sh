#!/bin/bash

mkdir -p /home/admin1/multichain-caliper/node-data/testchain
touch /home/admin1/multichain-caliper/node-data/testchain/multichain.conf

cat << EOF > /home/admin1/multichain-caliper/node-data/testchain/multichain.conf
rpcuser=username
rpcpassword=password
rpcallowip=0.0.0.0/0.0.0.0
EOF

cat /home/admin1/multichain-caliper/node-data/testchain/multichain.conf

multichaind testchain@10.244.48.74:1000 --rpcthreads=256 --datadir=/home/admin1/multichain-caliper/node-data --port=1000 --rpcport=999 --blocknotify="/home/admin1/multichain-caliper/server/event-listener-websockets/script.sh %s"
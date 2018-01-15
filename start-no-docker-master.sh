#!/bin/bash

mkdir -p /home/admin1/multichain-caliper/node-data/testchain

multichain-util create testchain --datadir=/home/admin1/multichain-caliper/node-data/testchain

sed -i "s/^anyone-can-connect.*/anyone-can-connect = true/" /home/admin1/multichain-caliper/node-data/testchain/params.dat
sed -i "s/^target-block-time.*/target-block-time = 2/" /home/admin1/multichain-caliper/node-data/testchain/params.dat

cat << EOF > /home/admin1/multichain-caliper/node-data/testchain/multichain.conf
rpcuser=username
rpcpassword=password
rpcallowip=0.0.0.0/0.0.0.0
EOF

cat /home/admin1/multichain-caliper/node-data/testchain/multichain.conf

multichaind testchain --datadir=/home/admin1/multichain-caliper/node-data/testchain --port=1000 --rpcport=999 --rpcthreads=256 --blocknotify="/home/admin1/multichain-caliper/server/event-listener-websockets/script.sh %s"
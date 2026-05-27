#!/bin/bash
cd /home/z/my-project
unset DATABASE_URL
export DATABASE_URL="mysql://ifleetpro_user:myjesus4mE2018@vps.lightworldtech.com:3306/ifleetpro_eam_system"
export DB_HOST=vps.lightworldtech.com
export DB_PORT=3306
export DB_USER=ifleetpro_user
export DB_PASSWORD=myjesus4mE2018
export DB_NAME=ifleetpro_eam_system

rm -rf .next

exec npx next dev -p 3000

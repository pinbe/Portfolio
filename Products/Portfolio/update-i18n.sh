#! /bin/bash

if [ !$1 ]; then
    ZCML=$INSTANCE_HOME/etc/site.zcml
else
    ZCML=$1
fi

i18nextract --path . --site_zcml $ZCML --domain portfolio -o locales

cat locales/portfolio.pot locales/portfolio-manual.pot > locales/portfolio-all.pot
mv locales/portfolio-all.pot locales/portfolio.pot

msgmerge --update --no-fuzzy-matching locales/fr/LC_MESSAGES/portfolio.po locales/portfolio.pot
msgmerge --update --no-fuzzy-matching locales/en/LC_MESSAGES/portfolio.po locales/portfolio.pot

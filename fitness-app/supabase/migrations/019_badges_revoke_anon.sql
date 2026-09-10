-- Le linter signale la fonction comme appelable par `anon`. Elle serait
-- inoffensive (auth.uid() est null pour un anonyme, la fonction sort
-- immédiatement), mais une SECURITY DEFINER exposée sans raison reste une
-- surface d'attaque à retirer.
revoke execute on function public.wodbud_recalc_badges(uuid) from anon;

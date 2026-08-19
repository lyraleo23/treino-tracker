import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Drink } from '../db/db'
import {
  addShortcut,
  deleteContainer,
  deleteDrink,
  deleteShortcut,
  saveContainer,
  saveDrink,
  saveHydrationGoal,
} from '../db/actions'
import { getHydrationGoal } from '../db/queries'
import { PageHeader } from '../components/PageHeader'
import { Modal } from '../components/Modal'
import { PlusIcon, TrashIcon } from '../components/icons'
import { parseNumber } from '../lib/format'

type DrinkForm = { id?: string; name: string; factor: string }
type ContainerForm = { id?: string; name: string; ml: string }

export function HydrationSetupPage() {
  const [goalForm, setGoalForm] = useState<string | null>(null)
  const [drinkForm, setDrinkForm] = useState<DrinkForm | null>(null)
  const [containerForm, setContainerForm] = useState<ContainerForm | null>(null)
  const [pairing, setPairing] = useState<Drink | null>(null)

  const data = useLiveQuery(async () => ({
    goalMl: await getHydrationGoal(),
    drinks: await db.drinks.filter((d) => d.archived === 0).sortBy('order'),
    containers: await db.containers.filter((c) => c.archived === 0).sortBy('order'),
    shortcuts: await db.drinkShortcuts.orderBy('order').toArray(),
  }))

  if (!data) return <div className="page" />

  const { goalMl, drinks, containers, shortcuts } = data
  const drinkById = new Map(drinks.map((d) => [d.id, d]))
  const containerById = new Map(containers.map((c) => [c.id, c]))

  const goal = goalForm ?? String(goalMl)
  const goalParsed = parseNumber(goal)
  const goalInvalido = goalParsed === undefined || goalParsed < 100

  return (
    <>
      <PageHeader
        title="Hidratação"
        subtitle="Meta, bebidas e atalhos"
        back
        backTo="/saude"
        backLabel="Saúde"
      />

      <div className="page">
        <h2 className="section-title">Meta diária</h2>
        <div className="field">
          <label className="field__label" htmlFor="hydration-goal">
            Quanto beber por dia (ml)
          </label>
          <input
            id="hydration-goal"
            className="input input--center"
            inputMode="numeric"
            value={goal}
            onChange={(event) => setGoalForm(event.target.value)}
          />
          {goalInvalido && <span className="hint">Use pelo menos 100 ml.</span>}
        </div>
        <button
          type="button"
          className="btn btn--block btn--primary"
          disabled={goalInvalido}
          onClick={async () => {
            await saveHydrationGoal(goalParsed!)
            setGoalForm(null)
          }}
        >
          Salvar meta
        </button>
        <p className="hint">
          Vale para os dias novos. Cada dia já registrado guarda a meta que valia
          nele, então mudar aqui não reescreve o histórico.
        </p>

        <h2 className="section-title">Bebidas</h2>
        <div className="list">
          {drinks.map((drink) => (
            <div key={drink.id} className="list__item">
              <button
                type="button"
                className="list__main"
                style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left' }}
                onClick={() =>
                  setDrinkForm({
                    id: drink.id,
                    name: drink.name,
                    factor: String(Math.round(drink.factor * 100)),
                  })
                }
              >
                <div className="list__name">{drink.name}</div>
                <div className="list__meta">conta {Math.round(drink.factor * 100)}%</div>
              </button>
              <div className="row" style={{ gap: 4 }}>
                <button
                  type="button"
                  className="btn btn--icon btn--ghost"
                  aria-label={`Criar atalho com ${drink.name}`}
                  onClick={() => setPairing(drink)}
                >
                  <PlusIcon />
                </button>
                <button
                  type="button"
                  className="btn btn--icon btn--ghost"
                  aria-label={`Remover ${drink.name}`}
                  onClick={() => void deleteDrink(drink.id)}
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="btn btn--block"
          style={{ marginTop: 8 }}
          onClick={() => setDrinkForm({ name: '', factor: '100' })}
        >
          <PlusIcon width={16} height={16} /> Nova bebida
        </button>
        <p className="hint">
          O fator diz quanto do volume conta para a meta. Os padrões são só um ponto
          de partida — a evidência sobre o quanto cada bebida hidrata é frouxa, então
          ajuste conforme você acredita.
        </p>

        <h2 className="section-title">Recipientes</h2>
        <div className="list">
          {containers.map((container) => (
            <div key={container.id} className="list__item">
              <button
                type="button"
                className="list__main"
                style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left' }}
                onClick={() =>
                  setContainerForm({
                    id: container.id,
                    name: container.name,
                    ml: String(container.ml),
                  })
                }
              >
                <div className="list__name">{container.name}</div>
                <div className="list__meta">{container.ml} ml</div>
              </button>
              <button
                type="button"
                className="btn btn--icon btn--ghost"
                aria-label={`Remover ${container.name}`}
                onClick={() => void deleteContainer(container.id)}
              >
                <TrashIcon />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="btn btn--block"
          style={{ marginTop: 8 }}
          onClick={() => setContainerForm({ name: '', ml: '300' })}
        >
          <PlusIcon width={16} height={16} /> Novo recipiente
        </button>

        <h2 className="section-title">Atalhos</h2>
        {shortcuts.length === 0 ? (
          <p className="hint">
            Nenhum atalho. Use o "+" ao lado de uma bebida para combiná-la com um
            recipiente.
          </p>
        ) : (
          <div className="list">
            {shortcuts.map((shortcut) => {
              const drink = drinkById.get(shortcut.drinkId)
              const container = containerById.get(shortcut.containerId)
              if (!drink || !container) return null
              return (
                <div key={shortcut.id} className="list__item">
                  <div className="list__main">
                    <div className="list__name">
                      {drink.name} · {container.name}
                    </div>
                    <div className="list__meta">{container.ml} ml</div>
                  </div>
                  <button
                    type="button"
                    className="btn btn--icon btn--ghost"
                    aria-label="Remover atalho"
                    onClick={() => void deleteShortcut(shortcut.id)}
                  >
                    <TrashIcon />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {drinkForm && (
        <DrinkFormModal
          form={drinkForm}
          onChange={setDrinkForm}
          onClose={() => setDrinkForm(null)}
        />
      )}

      {containerForm && (
        <ContainerFormModal
          form={containerForm}
          onChange={setContainerForm}
          onClose={() => setContainerForm(null)}
        />
      )}

      {pairing && (
        <Modal
          title={`Atalho para ${pairing.name}`}
          onClose={() => setPairing(null)}
          actions={
            <button type="button" className="btn btn--ghost btn--block" onClick={() => setPairing(null)}>
              Fechar
            </button>
          }
        >
          <p className="hint" style={{ marginTop: 0 }}>
            Em qual recipiente?
          </p>
          <div className="stack">
            {containers.map((container) => (
              <button
                key={container.id}
                type="button"
                className="btn btn--block"
                onClick={async () => {
                  await addShortcut(pairing.id, container.id)
                  setPairing(null)
                }}
              >
                {container.name} · {container.ml} ml
              </button>
            ))}
          </div>
        </Modal>
      )}
    </>
  )
}

function DrinkFormModal({
  form,
  onChange,
  onClose,
}: {
  form: DrinkForm
  onChange: (form: DrinkForm) => void
  onClose: () => void
}) {
  const factor = parseNumber(form.factor)
  const invalido = !form.name.trim() || factor === undefined || factor < 1 || factor > 100

  return (
    <Modal
      title={form.id ? 'Editar bebida' : 'Nova bebida'}
      onClose={onClose}
      actions={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={invalido}
            onClick={async () => {
              await saveDrink({ id: form.id, name: form.name, factor: factor! / 100 })
              onClose()
            }}
          >
            Salvar
          </button>
        </>
      }
    >
      <div className="stack">
        <div className="field">
          <label className="field__label" htmlFor="drink-name">
            Nome
          </label>
          <input
            id="drink-name"
            className="input"
            value={form.name}
            autoFocus={!form.id}
            placeholder="Água de coco"
            onChange={(event) => onChange({ ...form, name: event.target.value })}
          />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="drink-factor">
            Quanto conta para a meta (%)
          </label>
          <input
            id="drink-factor"
            className="input input--center"
            inputMode="numeric"
            value={form.factor}
            onChange={(event) => onChange({ ...form, factor: event.target.value })}
          />
          <span className="hint">
            {invalido ? 'Use um valor entre 1% e 100%.' : '100% conta o volume inteiro.'}
          </span>
        </div>
      </div>
    </Modal>
  )
}

function ContainerFormModal({
  form,
  onChange,
  onClose,
}: {
  form: ContainerForm
  onChange: (form: ContainerForm) => void
  onClose: () => void
}) {
  const ml = parseNumber(form.ml)
  const invalido = !form.name.trim() || ml === undefined || ml <= 0

  return (
    <Modal
      title={form.id ? 'Editar recipiente' : 'Novo recipiente'}
      onClose={onClose}
      actions={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={invalido}
            onClick={async () => {
              await saveContainer({ id: form.id, name: form.name, ml: ml! })
              onClose()
            }}
          >
            Salvar
          </button>
        </>
      }
    >
      <div className="stack">
        <div className="field">
          <label className="field__label" htmlFor="container-name">
            Nome
          </label>
          <input
            id="container-name"
            className="input"
            value={form.name}
            autoFocus={!form.id}
            placeholder="Caneca"
            onChange={(event) => onChange({ ...form, name: event.target.value })}
          />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="container-ml">
            Quantidade (ml)
          </label>
          <input
            id="container-ml"
            className="input input--center"
            inputMode="numeric"
            value={form.ml}
            onChange={(event) => onChange({ ...form, ml: event.target.value })}
          />
        </div>
      </div>
    </Modal>
  )
}
